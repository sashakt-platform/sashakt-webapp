export function formatUTCToISTDate(utcString: string) {
	const utcDate = new Date(utcString);

	// Get IST offset in milliseconds (UTC +5:30)
	const IST_OFFSET = 5.5 * 60 * 60 * 1000;

	const istDate = new Date(utcDate.getTime() + IST_OFFSET);

	const day = istDate.getDate();
	const month = istDate.toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
	const year = istDate.getFullYear();
	const time = istDate.toLocaleString('en-IN', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
		timeZone: 'Asia/Kolkata'
	});

	return { date: `${day} ${month} ${year}`, time };
}
