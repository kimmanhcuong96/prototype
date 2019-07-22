export const Config = {
    BASE_URL_MINTWAS: 'https://fss-cs.recaius.jp/vortex/v1/auth',
    BASE_URL_EPISODE_MANAGER: 'https://fss-cs.recaius.jp/vortex/v1',
    BASE_URL_TEXT_ANALYZER: 'https://fss-cs.recaius.jp/vortex/v1/text',
    // BASE_URL_MINTWAS: 'http://10.116.43.86/vortex/v1/auth/',
    // BASE_URL_EPISODE_MANAGER: 'http://10.116.43.86/vortex/v1/',
    // BASE_URL_TEXT_ANALYZER: 'http://10.116.43.86/vortex/v1/text/',
    SERVICE_ID: "tsdv-usr",
    SERVICE_PASSWORD: "tsdv1048",
    TIME_EXPIRE: 3600,

    EXTRACTION_MODEL_NAME: "障害報告",
    MAX_ADDITION_LEARNING_DATA: 1000,
    MAX_UPDATE_FILE: 10000,

    CSV_META_LABEL_TAG: 'tag',
    CSV_META_LABEL_CONTEXT: 'context',

    KEYWORD_SELECTION_EXPAND_SYNONYMS: true,
    KEYWORD_SELECTION_QUERY_WEIGHT: 1,
    KEYWORD_SELECTION_CONTEXT_WEIGHT: 5,
    KEYWORD_SELECTION_MAX_COUNT: 1000,

    INTERVAL_WAITING: 1000

}

export default Config;