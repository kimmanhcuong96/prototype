import axios from "axios";
import Config from "./appConfig";

/**
 * Config axios for Episode Manager server
 */
export const axiosEpisodeManager = axios.create({
	baseURL: Config.BASE_URL_EPISODE_MANAGER
});
axiosEpisodeManager.interceptors.response.use(null, error => {
	return unauthorizedInterceptor(error);
});
axiosEpisodeManager.interceptors.request.use(config => {
	return tokenAttachmentInterceptor(config);
});

/**
 * Config axios for Text Analyzer server
 */
export const axiosTextAnalyzer = axios.create({
	baseURL: Config.BASE_URL_TEXT_ANALYZER
})

axiosTextAnalyzer.interceptors.response.use(null, error => {
	return unauthorizedInterceptor(error);
});
axiosTextAnalyzer.interceptors.request.use(config => {
	return tokenAttachmentInterceptor(config);
});

/**
 * Config axios for Mintwas server
 */
export const axiosMintwas = axios.create({
	baseURL: Config.BASE_URL_MINTWAS,
	headers: {
		"Content-Type": "application/json"
	}
});

const tokenAttachmentInterceptor = config => {
	config.headers = {
		"X-Token": localStorage.getItem('token'),
		"Content-Type": "application/json;charset=UTF-8"
	};
	return config;
}

/**
 * In case of 401 error, get new token with default credentials and re-try the request.
 */
const unauthorizedInterceptor = (error) => {
	if (error.config && error.response && error.response.status === 401) {
		let config = error.config;
		if (!config._retryCount || config._retryCount < 3) {
			return getToken().then(res => {
				console.log("Retrying " + config._retryCount);
				localStorage.setItem('token', res.data.token);
				error.config.headers["X-Token"] = res.data.token;
				if(!config._retryCount) {
					config._retryCount = 1;
				} else {
					config._retryCount += 1;
				}
				return axios.request(error.config);
			});
		}
	}

	return Promise.reject(error);
}

const getToken = () => {
	return axiosEpisodeManager.post("/auth/tokens", {
		knowledge_explorer: {
			service_id: `${Config.SERVICE_ID}`,
			password: `${Config.SERVICE_PASSWORD}`
		},
		expiry_sec: `${Config.TIME_EXPIRE}`
	});
};
