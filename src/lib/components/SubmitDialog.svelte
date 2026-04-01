<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import { t } from 'svelte-i18n';

	let {
		open = $bindable(),
		isSubmitting,
		submitError,
		answeredAllMandatory,
		formEnhance
	}: {
		open: boolean;
		isSubmitting: boolean;
		submitError: string | null;
		answeredAllMandatory: boolean;
		formEnhance: Parameters<typeof enhance>[1];
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		<Button class="w-24">{$t('Submit')}</Button>
	</Dialog.Trigger>
	{#if answeredAllMandatory}
		<Dialog.Content class="w-80 rounded-xl">
			<Dialog.Title>
				{#if submitError || page.form?.submitTest === false || page.form?.error}
					{$t('Submission Failed')}
				{:else}
					{$t('Submit test?')}
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				{#if submitError || page.form?.submitTest === false || page.form?.error}
					<div class="text-destructive">
						{#if submitError}
							<p class="mb-2">{submitError}</p>
						{:else if page.form?.error}
							<p class="mb-2">{page.form.error}</p>
						{:else}
							<p class="mb-2">
								{$t('There was an issue with your previous submission.')}
							</p>
						{/if}
						<p class="text-muted-foreground">
							{$t('Please click Confirm again to retry.')}
						</p>
					</div>
				{:else}
					{$t(
						'Are you sure you want to submit for final marking? No changes will be allowed after submission.'
					)}
				{/if}
			</Dialog.Description>
			<div class="mt-2 inline-flex items-center justify-between">
				<Dialog.Close>
					<Button variant="outline" class="w-32" disabled={isSubmitting}>{$t('Cancel')}</Button>
				</Dialog.Close>
				<form action="?/submitTest" method="POST" use:enhance={formEnhance}>
					<Button type="submit" class="w-32" disabled={isSubmitting}>
						{#if isSubmitting}
							<Spinner />
						{/if}
						{$t('Confirm')}
					</Button>
				</form>
			</div>
		</Dialog.Content>
	{:else}
		<Dialog.Content class="w-80 rounded-xl">
			<Dialog.Title class="mt-4">{$t('Answer all mandatory questions!')}</Dialog.Title>
			<Dialog.Description class="text-center">
				{$t('Please make sure all mandatory questions are answered')}
				{$t('before submitting the test')}.
			</Dialog.Description>
			<Dialog.Close><Button class="mt-2 w-full">{$t('Okay')}</Button></Dialog.Close>
		</Dialog.Content>
	{/if}
</Dialog.Root>
