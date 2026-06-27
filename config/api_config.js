// 统一第三方 API 配置：后续切换服务商只改这里，不改业务代码。
const AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1';

export default {
  textModel: {
    baseUrl: process.env.TEXT_MODEL_BASE_URL || AGNES_BASE_URL,
    apiKey: process.env.TEXT_MODEL_API_KEY || '',
    model: process.env.TEXT_MODEL_NAME || 'agnes-2.0-flash'
  },
  imageModel: {
    baseUrl: process.env.IMAGE_MODEL_BASE_URL || AGNES_BASE_URL,
    apiKey: process.env.IMAGE_MODEL_API_KEY || '',
    model: process.env.IMAGE_MODEL_NAME || 'agnes-image-2.1-flash'
  },
  videoModel: {
    baseUrl: process.env.VIDEO_MODEL_BASE_URL || AGNES_BASE_URL,
    apiKey: process.env.VIDEO_MODEL_API_KEY || '',
    model: process.env.VIDEO_MODEL_NAME || 'agnes-video-v2.0'
  },
  imgbb: {
    apiKey: process.env.IMGBB_API_KEY || ''
  }
};
