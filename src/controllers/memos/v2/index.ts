import {pluginConfigData} from "@/index";
import {DownloadResourceByName, GetAuthStatus, GetResourceBinary, ListMemos, ListMemos_v0_24, ListMemos_v0_25} from "@/controllers/memos/v2/api"
import {debugMessage, hasCommonElements, isEmptyValue} from "@/utils";
import {toChinaTime, formatDateTime, isUpdateNewerThanSyncTime} from "@/utils/misc/time";
import {IResGetMemos} from "@/types/memos";
import moment from "moment";
import {IMemoV2, IResourceV2} from "@/types/memos/v2";
import {tagFilterKey} from "@/constants/components/select";
import {API_VERSION} from "@/constants/memos";
import {IResListMemos} from "@/types/memos/v2/api";


export class MemosApiServiceV2 {
    private static username: string;

    /**
     * 初始化数据
     * @private
     */
    private static async initData() {
        const userData = await GetAuthStatus();
        if (!userData) {
            throw new Error('初始化失败：无法获取用户信息');
        }
        this.username = userData.name;
    }

    private static async tagFilter(memos: IMemoV2[])  {
        const tagFilterMode = pluginConfigData.filter.tagFilterMode;

        // 同步所有数据
        if (tagFilterMode === tagFilterKey.all) {
            return memos;
        }

        // 仅同步无标签的数据
        if (tagFilterMode === tagFilterKey.syncNoTag) {
            console.log("仅同步无标签的数据");
            if (API_VERSION.V2_Y2025_M02_D05.includes(pluginConfigData.base.version)){
                return memos.filter(memo => memo.tags.length === 0)
            }
            return memos.filter(memo => memo.property.tags.length === 0)
        }

        // 不同步无标签的数据
        if (tagFilterMode === tagFilterKey.notSyncNoTag) {
            console.log("不同步无标签的数据");
            if (API_VERSION.V2_Y2025_M02_D05.includes(pluginConfigData.base.version)){
                return memos.filter(memo => memo.tags.length > 0)
            }
            return memos.filter(memo => memo.property.tags.length > 0)
        }

        let tagListString = pluginConfigData.filter.tagList;
        let tags = tagListString.split(";");

        // 仅同步指定标签的数据
        if (tagFilterMode === tagFilterKey.syncSpecTag) {
            console.log("仅同步指定标签的数据");
            if (API_VERSION.V2_Y2025_M02_D05.includes(pluginConfigData.base.version)){
                console.log(tags);
                return memos.filter(memo => hasCommonElements(memo.tags, tags))
            }
            return memos.filter(memo => hasCommonElements(memo.property.tags, tags))
        }

        // 不同步指定标签的数据
        if (tagFilterMode === tagFilterKey.notSyncSpecTag) {
            console.log("不同步指定标签的数据");
            if (API_VERSION.V2_Y2025_M02_D05.includes(pluginConfigData.base.version)){
                return memos.filter(memo => !hasCommonElements(memo.tags, tags))
            }
            return memos.filter(memo => !hasCommonElements(memo.property.tags, tags))
        }

        // 同步指定标签及无标签的数据
        if (tagFilterMode === tagFilterKey.syncSpecTagAndNoTag) {
            console.log("同步指定标签及无标签的数据");
            if (API_VERSION.V2_Y2025_M02_D05.includes(pluginConfigData.base.version)){
                return memos.filter(memo => hasCommonElements(memo.tags, tags) || memo.tags.length === 0)
            }
            return memos.filter(memo => hasCommonElements(memo.property.tags, tags) || memo.property.tags.length === 0)
        }

        // 不同步指定标签及无标签的数据
        if (tagFilterMode === tagFilterKey.notSyncSpecTagAndNoTag) {
            console.log("不同步指定标签及无标签的数据");
            if (API_VERSION.V2_Y2025_M02_D05.includes(pluginConfigData.base.version)){
                return memos.filter(memo => !hasCommonElements(memo.tags, tags) && memo.tags.length > 0)
            }
            return memos.filter(memo => !hasCommonElements(memo.property.tags, tags) && memo.property.tags.length > 0)
        }

        return memos;
    }


    /**
     * 获取 Memos 数据
     */
    private static async getAllMemos() {
        debugMessage(pluginConfigData.debug.isDebug, "正在获取 Memos 数据...");

        await this.initData();

        const version = pluginConfigData.base.version;
        const lastSyncTime = pluginConfigData.filter.lastSyncTime; // 上次同步时间
        const pageSize: number = 200; // 每页最大条数
        let pageToken = undefined;

        let allMemos = [];

        // 注意：creator过滤器可能不被所有Memos版本支持，改为在本地过滤
        // let filters = [
        //     `creator == "${this.username}"`
        // ];

        while (true) {
            let resData: IResListMemos;
            // 调用 ListMemos 函数获取一页数据（不使用creator过滤器）
            if (API_VERSION.V2_API.includes(version)) {
                resData = await ListMemos_v0_25(pageSize, pageToken, []);
            } else if (API_VERSION.V2_Y2025_M02_D05.includes(version)) {
                resData = await ListMemos_v0_24(this.username, pageSize, pageToken);
            } else if(API_VERSION.V2_MemosViewFull.includes(version)) {
                const view = "MEMO_VIEW_FULL";
                resData = await ListMemos(pageSize, pageToken, [], view);
            } else {
                resData = await ListMemos(pageSize, pageToken, []);
            }

            // 检查API响应是否有效
            if (!resData || !resData.memos) {
                debugMessage(pluginConfigData.debug.isDebug, "API响应无效或无数据", resData);
                break;
            }

            // 先按照更新时间过滤，然后再按照creator过滤（在本地进行）
            const memos = resData.memos.filter(
                memo => {
                    // 检查更新时间
                    if (!isUpdateNewerThanSyncTime(memo.updateTime, lastSyncTime)) {
                        return false;
                    }
                    // 检查creator是否匹配（可选，如果需要过滤）
                    // 注意：这里不过滤creator，获取所有数据
                    return true;
                }
            );
            debugMessage(pluginConfigData.debug.isDebug, `过滤前数据数: ${resData.memos.length}, 过滤后数据数: ${memos.length}, lastSyncTime: ${lastSyncTime}`);
            allMemos.push(...memos);

            // 检查当前页是否还有更新时间大于等于 lastSyncTime 的数据，如果没有则退出循环
            if (memos.length < resData.memos.length || !resData.nextPageToken) {
                break;
            }

            // 更新 pageToken 以获取下一页数据
            pageToken = resData.nextPageToken;
        }

        debugMessage(pluginConfigData.debug.isDebug, "数据拉取结果", allMemos);

        // 标签过滤
        if (API_VERSION.V2_LabelFilter.includes(version)) {
            allMemos = await MemosApiServiceV2.tagFilter(allMemos);
            debugMessage(pluginConfigData.debug.isDebug, "标签过滤结果", allMemos);
        }

        return allMemos;
    }


    // **************************************** export ****************************************


    /**
     * 获取用户数据
     */
    static async getUserData() {
        const userData = await GetAuthStatus();
        if (!userData) {
            throw new Error('获取用户信息失败：认证无效或服务器错误');
        }
        return {
            /**
             * 用户名称
             */
            name: userData.name
        }
    }

    /**
     * 授权校验
     */
    static async checkAccessToken() {
        const userData = await GetAuthStatus();
        return !isEmptyValue(userData);
    }

    /**
     * 检查新数据
     */
    static async checkNew() {
        const memos = await this.getAllMemos();
        return memos.length > 0;
    }

    /**
     * 获取 Memos 数据
     */
    static async getMemos(): Promise<IResGetMemos> {
        let allMemos = await this.getAllMemos();

        debugMessage(pluginConfigData.debug.isDebug, "正在整理 Memos 数据...");

        const lastSyncTime = pluginConfigData.filter.lastSyncTime; // 上次同步时间

        let memosCreatedBeforeLastSync = allMemos.filter(
            memo => moment(toChinaTime(memo.createTime)).isBefore(formatDateTime(lastSyncTime))
        );

        let result: IResGetMemos = {
            new: allMemos,
            old: memosCreatedBeforeLastSync
        };

        debugMessage(pluginConfigData.debug.isDebug, "整理结果", result);

        return result;
    }

    static async downloadResource(resource: IResourceV2) {
        if (API_VERSION.V2_DownloadResourceByName.includes(pluginConfigData.base.version)) {
            return await DownloadResourceByName(resource.name);
        } else {
            return await GetResourceBinary(resource.name, resource.filename);
        }
    }
}
