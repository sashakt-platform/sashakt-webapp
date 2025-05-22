import sampleTestData from '../../data/quest-data.json';

export const getTestBySlug = (slug) => {
	// TODO: we should first check if the data exists in the localstorage
	// if yes, then return data
	// else make actual call to backend
	// TODO: This to be replaced by actual call to the backend
	const testData = sampleTestData;

	// we should store the recieved data to localstorage

	return { testData };
};
