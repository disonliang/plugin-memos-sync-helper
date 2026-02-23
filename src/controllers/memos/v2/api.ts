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
    // 优先尝试 API 端点获取用户信息（返回的 name 字段为 "users/X" 格式）
    try {
        const result = await Requests.send(METHOD.GET, "/api/v1/auth/status");
        if (result && result.name) {
            console.log('[Memos] Auth status from API:', JSON.stringify(result));
            return result;
        }
    } catch (error) {
        console.warn('[Memos] /api/v1/auth/status failed:', error);
    }

    // 降级：从JWT token解析用户信息
    return parseUserFromToken();
}

/**
 * 从JWT token解析用户信息
 * Memos JWT payload 通常包含:
 *   - name: "users/1" (资源名) 或 "admin" (显示名)
 *   - sub: "users/1" 或 数字用户ID
 */
function parseUserFromToken() {
    try {
        const token = pluginConfigData.base.token;
        if (!token) {
            return null;
        }

        // 检查 token 是否是 JWT 格式（三段式 xxx.yyy.zzz）
        const parts = token.split('.');
        if (parts.length !== 3) {
            // 不是 JWT，可能是 Access Token，无法解析用户名
            console.warn('[Memos] Token is not JWT format, cannot parse user info');
            return {
                name: null,
                username: null
            };
        }

        const payload = parts[1];
        const decoded = JSON.parse(atob(payload));
        console.log('[Memos] JWT decoded payload:', JSON.stringify(decoded));

        // 尝试获取 "users/X" 格式的资源名
        // 优先级: name(如果已是users/格式) > sub(如果已是users/格式) > 用sub构造
        let resourceName = null;

        if (decoded.name && String(decoded.name).startsWith('users/')) {
            resourceName = decoded.name;
        } else if (decoded.sub && String(decoded.sub).startsWith('users/')) {
            resourceName = decoded.sub;
        } else if (decoded.sub && /^\d+$/.test(String(decoded.sub))) {
            resourceName = `users/${decoded.sub}`;
        } else {
            // 无法确定 users/X 格式，设为 null，后续跳过 creator 过滤
            resourceName = decoded.name || decoded.sub || null;
        }

        console.log('[Memos] Resolved user resource name:', resourceName);

        return {
            name: resourceName,
            username: decoded.username || decoded.name || 'Unknown'
        };
    } catch (error) {
        console.error('[Memos] Failed to parse JWT token:', error);
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