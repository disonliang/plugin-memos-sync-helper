import moment from "moment";
import {pluginConfigData} from "@/index";


/**
 * 将不同时间的时间转换为上海时区的时间
 * @param timeString
 */
export function toChinaTime(timeString: string) {
    return moment(timeString).utcOffset('+08:00').format('YYYY-MM-DD HH:mm:ss');
}

export function formatDateTime(timeString: string | number) {
    const timestamp = typeof timeString === 'number' ? timeString * 1000 : timeString;
    // return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
    return moment(timestamp).format(pluginConfigData.advanced.formatDataTime);
}

export function formatDate(timeString: string | number) {
    const timestamp = typeof timeString === 'number' ? timeString * 1000 : timeString;
    return moment(timestamp).format('YYYY-MM-DD');
}

/**
 * 比较两个时间，判断更新时间是否晚于等于同步时间
 * @param updateTime - 更新时间（ISO格式，如：2026-02-13T02:47:32Z）
 * @param syncTime - 同步时间（格式化字符串，如：2021-12-08 00:00:00）
 */
export function isUpdateNewerThanSyncTime(updateTime: string, syncTime: string): boolean {
    // 将更新时间转换为中国时区的格式化时间
    const updateTimeInChina = toChinaTime(updateTime);
    // 使用字符串比对（YYYY-MM-DD HH:mm:ss格式下，字符串比对等同于时间比对）
    return updateTimeInChina >= syncTime;
}

/**
 * 休眠
 * @param ms - 时间单位
 * @constructor
 */
export const sleep = (ms: number)=> {
    return new Promise(resolve=>setTimeout(resolve, ms))
}