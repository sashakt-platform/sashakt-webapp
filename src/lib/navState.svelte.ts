class NavState {
	active = $state(false);
	instructions = $state<string | undefined>(undefined);
	onPaletteOpen = $state<(() => void) | undefined>(undefined);
	remainingMandatoryCount = $state(0);
	showPalette = $state(false);
}

export const navState = new NavState();
