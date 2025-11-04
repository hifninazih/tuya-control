import { TuyaContext } from "@tuya/tuya-connector-nodejs";

// Inisialisasi konektor Tuya
export const tuya = new TuyaContext({
  baseUrl: process.env.TUYA_API_REGION!,
  accessKey: process.env.TUYA_CLIENT_ID!,
  secretKey: process.env.TUYA_SECRET!,
});
