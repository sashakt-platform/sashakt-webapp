export function convertUTCToIST(utcString: string) {
	const utcDate = new Date(utcString);

	// Get IST offset in milliseconds (UTC +5:30)
	const IST_OFFSET = 5.5 * 60 * 60 * 1000;

	const istDate = new Date(utcDate.getTime() + IST_OFFSET);

	return istDate.toLocaleString('en-IN', {
		timeZone: 'Asia/Kolkata',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: true
	});
}
