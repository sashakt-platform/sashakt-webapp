import { page } from '$app/state';
import type { TCandidate } from '$lib/types';

const HEARTBEAT_INTERVAL_MS = 15000;
const TEN_MINUTES_IN_SECONDS = 10 * 60;

/**
 * Shared countdown/dialog state for the test timer. TestTimer.svelte may be
 * mounted more than once at a time (e.g. one instance per responsive nav
 * layout); this singleton ensures the countdown, heartbeat sync, and the
 * "time left" dialog only ever run once regardless of how many TestTimer
 * instances are mounted.
 */
class TestTimerState {
	timeLeft = $state(0);
	open = $state(false);
	isSubmitting = $state(false);
	submitError = $state<string | null>(null);
	formElement = $state<HTMLFormElement>();

	// Public so instances can read it via a plain $derived (a pure read never
	// causes the "effect reads and writes the same state" loop). All writes to
	// ownerId happen here, from register()/unregister() — plain imperative
	// calls from onMount, never from inside a reactive $effect.
	ownerId = $state<symbol | null>(null);

	private registeredInstances = new Set<symbol>();
	private candidate: TCandidate | null = null;
	private pauseTimerWhenInactive = false;
	private hasTriggeredAutoSubmit = false;
	// Both the countdown tick and a resume/heartbeat sync response can detect
	// the same "crossed 10 minutes" event independently (one on a 1s timer,
	// the other whenever its network request resolves). Without this latch,
	// closing the dialog after the first detection gets reopened moments
	// later by the second one.
	private hasShownTenMinuteWarning = false;
	private countdownInterval: ReturnType<typeof setInterval> | null = null;
	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
	private submitTimeout: ReturnType<typeof setTimeout> | null = null;
	private nextSyncRequestId = 0;
	private latestAppliedSyncRequestId = 0;

	register(
		instanceId: symbol,
		initialTime: number,
		candidate: TCandidate | null,
		pauseTimerWhenInactive: boolean
	) {
		// only the first instance to register seeds the shared state; later
		// instances mounting alongside it (e.g. the other responsive layout)
		// must not stomp on a countdown that's already ticking.
		if (this.registeredInstances.size === 0) {
			this.timeLeft = initialTime;
			this.candidate = candidate;
			this.pauseTimerWhenInactive = pauseTimerWhenInactive;
		}

		this.registeredInstances.add(instanceId);
		if (this.ownerId === null) {
			this.ownerId = instanceId;
		}
	}

	unregister(instanceId: symbol) {
		this.registeredInstances.delete(instanceId);

		if (this.ownerId === instanceId) {
			const [nextOwner] = this.registeredInstances;
			this.ownerId = nextOwner ?? null;
		}

		if (this.registeredInstances.size === 0) {
			this.reset();
		}
	}

	/** Test-only escape hatch: force back to a clean slate between test cases. */
	resetForTests() {
		this.registeredInstances.clear();
		this.ownerId = null;
		this.reset();
	}

	startForOwner() {
		if (!this.pauseTimerWhenInactive) {
			this.startCountdown();
			return;
		}
		this.resumeTimer();
	}

	stopForOwner() {
		this.clearCountdownInterval();
		this.clearHeartbeatInterval();
	}

	private reset() {
		this.stopForOwner();
		this.clearSubmitTimeout();
		this.timeLeft = 0;
		this.open = false;
		this.isSubmitting = false;
		this.submitError = null;
		this.formElement = undefined;
		this.candidate = null;
		this.pauseTimerWhenInactive = false;
		this.hasTriggeredAutoSubmit = false;
		this.hasShownTenMinuteWarning = false;
		this.nextSyncRequestId = 0;
		this.latestAppliedSyncRequestId = 0;
	}

	private clearCountdownInterval() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}
	}

	private clearHeartbeatInterval() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	private clearSubmitTimeout() {
		if (this.submitTimeout) {
			clearTimeout(this.submitTimeout);
			this.submitTimeout = null;
		}
	}

	private triggerAutoSubmit() {
		if (this.hasTriggeredAutoSubmit) return;
		this.hasTriggeredAutoSubmit = true;
		this.clearSubmitTimeout();
		this.submitTimeout = setTimeout(() => {
			this.formElement?.requestSubmit();
		}, 5000);
	}

	private handleTimeUp() {
		this.timeLeft = 0;
		this.open = true;
		this.clearCountdownInterval();
		this.clearHeartbeatInterval();
		this.triggerAutoSubmit();
	}

	private maybeShowTenMinuteWarning() {
		if (this.hasShownTenMinuteWarning) return;
		if (this.timeLeft !== TEN_MINUTES_IN_SECONDS) return;
		this.hasShownTenMinuteWarning = true;
		this.open = true;
	}

	private updateTimeLeft(nextTimeLeft: number) {
		this.timeLeft = Math.max(nextTimeLeft, 0);
		this.maybeShowTenMinuteWarning();
		if (this.timeLeft === 0) this.handleTimeUp();
	}

	private startCountdown() {
		this.clearCountdownInterval();
		this.countdownInterval = setInterval(() => {
			this.maybeShowTenMinuteWarning();
			if (this.timeLeft <= 1) {
				this.handleTimeUp();
			} else {
				this.timeLeft--;
			}
		}, 1000);
	}

	private async syncTimer(event: 'resume' | 'heartbeat') {
		if (!this.pauseTimerWhenInactive || !this.candidate) return;

		const requestId = ++this.nextSyncRequestId;

		try {
			const response = await fetch(`/test/${page.params.slug}/api/timer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ candidate: this.candidate, event })
			});

			if (!response.ok) return;

			const data = await response.json();
			if (typeof data.time_left !== 'number') return;
			if (requestId < this.latestAppliedSyncRequestId) return;

			this.latestAppliedSyncRequestId = requestId;
			this.updateTimeLeft(Math.min(this.timeLeft, data.time_left));
		} catch {
			// keep the local countdown running if the sync request fails
		}
	}

	private startHeartbeat() {
		if (!this.pauseTimerWhenInactive || !this.candidate || this.heartbeatInterval) return;

		this.heartbeatInterval = setInterval(() => {
			void this.syncTimer('heartbeat');
		}, HEARTBEAT_INTERVAL_MS);
	}

	private resumeTimer() {
		this.startCountdown();
		this.startHeartbeat();
		void this.syncTimer('resume');
	}
}

export const testTimerState = new TestTimerState();
