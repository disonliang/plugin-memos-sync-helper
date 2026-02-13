import { METHOD } from "@/constants/utils/request";
import { isEmptyValue } from "@/utils";
import { Requests } from "@/utils/requests";
import { IResListMemos } from "@/types/memos/v2/api";
import { pluginConfigData } from "@/index";


/**
 * 转换过滤器
 * @param filter - 待处理的过滤器
 */
function changeFilter(filter: any) {
    return isEmptyValue(filter) ? null : filter.join(" && ")
}


// **************************************** UserService ****************************************


/**
 * 列出用户列表
 * 注：需要管理员身份及以上
 * @constructor
 */
export async function ListUsers() {
    return await Requests.send(METHOD.GET, '/api/v1/users');
}


// **************************************** MemoService ****************************************


/**
 * 获取用户的当前身份验证信息
 * @constructor
 */
export async function GetAuthStatus() {
    // 尝试使用API端点，如果失败则从JWT token解析
    // /api/v1/users/me 接口不存在，改用 token 解析
    // try {
    //     const result = await Requests.send(METHOD.GET, "/api/v1/users/me");
    //     if (result) {
    //         return result;
    //     }
    // } catch (error) {
    //     console.warn('API auth endpoint failed, falling back to JWT parsing');
    // }

    // 从JWT token解析用户信息
    return parseUserFromToken();
}

/**
 * 从JWT token解析用户信息
 */
function parseUserFromToken() {
    try {
        const token = pluginConfigData.base.token;
        if (!token) {
            return null;
        }

        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));

        return {
            name: decoded.name || decoded.username || 'Unknown',
            username: decoded.name || decoded.username || 'Unknown'
        };
    } catch (error) {
        console.error('Failed to parse JWT token:', error);
        return null;
    }
}




/**
 * 列出带有分页和过滤器的备忘录
 * @param pageSize - 返回的最大条数
 * @param pageToken - 检索后续页面的令牌
 * @param filter - 过滤器
 * @param view - 显示所有参数
 * @constructor
 */
export async function ListMemos(pageSize?: number, pageToken?: string, filter?: any, view?: string): Promise<IResListMemos> {
    return await Requests.send(METHOD.GET, '/api/v1/memos', {
        pageSize: pageSize,
        pageToken: pageToken,
        filter: changeFilter(filter),
        view: view
    });
}

/**
 * 列出带有分页和过滤器的备忘录 v0.24.0
 * @param parent - 拥有者
 * @param pageSize - 返回的最大条数
 * @param pageToken - 检索后续页面的令牌
 * @param state - 状态
 * @param sort - 作为排序规则的字段，默认为 display_time
 * @param direction - 排序方向，默认为 DESC
 * @param filter - 过滤器
 * @param oldFilter - 旧版过滤器
 * @constructor
 */
export async function ListMemos_v0_24(parent?: string, pageSize?: number, pageToken?: string, state?: string, sort?: string, direction?: string, filter?: any, oldFilter?: any) {
    return await Requests.send(METHOD.GET, '/api/v1/memos', {
        parent: parent,
        pageSize: pageSize,
        pageToken: pageToken,
        state: state,
        sort: sort,
        direction: direction,
        filter: changeFilter(filter),
        oldFilter: changeFilter(oldFilter)
    });
}

/**
 * 列出带有分页和过滤器的备忘录 v0.25.0
 * @param pageSize - 返回的最大条数
 * @param pageToken - 检索后续页面的令牌
 * @param filter - 过滤器
 * @constructor
 */
export async function ListMemos_v0_25(pageSize?: number, pageToken?: string, filter?: any) {
    return await Requests.send(METHOD.GET, '/api/v1/memos', {
        pageSize: pageSize,
        pageToken: pageToken,
        filter: changeFilter(filter)
    });
}


// **************************************** ResourceService ****************************************


/**
 * 按名称返回资源二进制文件
 * @param name
 * @param filename
 * @constructor /file/resources/35
 */
export async function GetResourceBinary(name: string, filename: string) {
    return await Requests.get(`/file/${name}/${filename}`);
}

export async function DownloadResourceByName(name: string) {
    return await Requests.get(`/file/${name}`);
}

export async function GetMemo(id: string | number) {
    return await Requests.send(METHOD.GET, `/api/v1/memos/${id}`);
}