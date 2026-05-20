/**
 * AI Coaching and Plot deduction Orchestrator
 * Communicates with DeepSeek-V3 via the system proxy
 */
import { state } from './state.js';

const SYSTEM_PROMPT = `你是一位顶尖的网络小说总编辑和叙事结构大师。你的职责是协助创作者发现文中的伏笔遗漏、逻辑漏洞，并提供能够调动读者胃口的精彩剧情推演。\n请始终保持敏锐、温和而深邃的文风。所有的反馈意见都应基于文学叙事理论（如“契诃夫之枪”理论）。`;

export async function askAiCoach(actionType, docTitle, docContent, foreshadows = []) {
    let prompt = "";
    
    if (actionType === 'analyze_foreshadow') {
        prompt = `我的小说草稿标题是：《${docTitle}》\n下面是目前已登记的伏笔设定：\n${foreshadows.map((f, i) => `${i+1}. [${f.clue_title}]: ${f.content} (${f.is_resolved ? '已回收' : '未回收'}，出现位置：${f.planted_at_position})`).join('\\n')}\n\n这是当前正文内容：\n\"\"\"\n${docContent}\n\"\"\"\n\n请对本段小说进行“伏笔闭环分析”：\n1. 评估正文中是否有潜在的、已经写出但没有记在伏笔设定里的重要伏笔或道具。\n2. 已经标记为“未回收”的伏笔，目前在正文中是否有铺垫或回收契机？\n3. 从节奏上，是否在短时间内塞入了过多的线索？`;
    } else {
        prompt = `我的小说草稿标题是：《${docTitle}》\n以下是我埋设的尚未回收的伏笔：\n${foreshadows.filter(f => !f.is_resolved).map((f, i) => `${i+1}. [${f.clue_title}]: ${f.content}`).join('\\n')}\n\n这是当前正卷文本：\n\"\"\"\n${docContent}\n\"\"\"\n\n请针对当前剧情节奏进行“剧情定向推演”，给出2到3个可能的后续情节分支方向。\n特别注意：\n- 必须巧妙地利用上面提到的未回收伏笔，做到草灰蛇线、出人意料而情理之中。\n- 用精炼富有画面的网文段落展示，帮助我打破写作瓶颈。`;
    }

    return callDeepSeek(prompt);
}


export async function continueWrite(title, beforeText) {
    const prompt = `你是一位卓越的小说家。请根据以下小说的标题《${title}》和前文，为你提供三种不同文学风格的后续情节续写方案：
【戏剧冲突】风格：节奏强，冲突一触即发；
【细腻情感】风格：心理、神态及细节极其入微；
【悬疑反转】风格：出其不意，透露出某种难以察觉的阴谋、变故。

前文内容如下：
"${beforeText}"

【要求】：
1. 三个方案各不相同，字数均不超过150字。
2. 请直接以 JSON 数组格式返回，不要有额外的解释说明文字，也不要包裹在markdown语法块外。格式如下：
[
  {"style": "戏剧冲突", "text": "续写文本..."},
  {"style": "细腻情感", "text": "续写文本..."},
  {"style": "悬疑反转", "text": "续写文本..."}
]`;

    try {
        const responseText = await callDeepSeek(prompt, 1.0);

        let cleanJson = responseText.replace(new RegExp('```json', 'g'), '').replace(new RegExp('```', 'g'), '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.warn("AI parse failed, using creative fallback generators.");
        return getMockContinuations(beforeText);
    }
}


export async function checkErrors(text) {
    const prompt = `作为高级网文编辑，对以下选段进行细致的文笔瑕疵、标点、语病与逻辑矛盾扫描。请完全不破坏原有文风，指出3处以内最核心的问题，并给出精准的替换方案。
选段内容：
"${text}"

请返回纯 JSON 格式数据，不要有多余的叙述和标记：
[
  {"wrong": "错误的原文片段", "fix": "推荐的修改方案", "reason": "为什么不通，时态、逻辑、或错字"}
]`;

    try {
        const responseText = await callDeepSeek(prompt, 0.5);
        let cleanJson = responseText.replace(new RegExp('```json', 'g'), '').replace(new RegExp('```', 'g'), '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        return getMockErrors(text);
    }
}


export async function extractForeshadows(content) {
    const prompt = `请从以下小说段落中深度扫描，找出作者可能作为“伏笔”、“钩子”或者重要暗线道具的片段（重点留意“但是”、“后来才发现”、“其实”、“实际上”等强转折关键句周围的描述）。
文本内容：
"${content}"

请提取出最多3个潜在伏笔。以纯 JSON 格式返回，不要解释：
[
  {"clue_title": "精炼的伏笔名称", "content": "埋下的秘密与后期可能的回收方向说明", "planted_at_position": "文中大概位置"}
]`;

    try {
        const responseText = await callDeepSeek(prompt, 0.7);
        let cleanJson = responseText.replace(new RegExp('```json', 'g'), '').replace(new RegExp('```', 'g'), '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        return getMockForeshadows(content);
    }
}


export async function generateThemeGuide(themeKey, themeName) {
    const prompt = `根据主题“${themeName}”（对应的键值为：${themeKey}），请你生成一段200字内、唯美且极具代入感的小说开篇场景引导句。它将作为创作者的灵感首段。
直接输出这段场景文字，不要任何其他废话或“这是为您生成的...”前缀。`;

    try {
        return await callDeepSeek(prompt, 0.85);
    } catch (e) {
        return getMockThemeGuide(themeKey);
    }
}


async function callDeepSeek(prompt, temp = 0.7) {
    const apiKey = state.customApiKey || "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";
    const targetUrl = "https://openrouter.ai/api/v1/chat/completions";
    const proxyUrl = "https://edge.flowith.io/api-proxy/" + encodeURIComponent(targetUrl);

    const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "AI Novel Assistant"
        },
        body: JSON.stringify({
            model: "deepseek/deepseek-chat-v3-0324:free",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            temperature: temp,
            max_tokens: 1200
        })
    });

    if (!response.ok) {
        throw new Error(`API response status ${response.status}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0]) {
        return data.choices[0].message.content;
    } else {
        throw new Error("No valid response from AI endpoint.");
    }
}


function getMockContinuations(beforeText) {
    const words = beforeText ? beforeText.slice(-15) : "此时此刻";
    return [
        {
            style: "戏剧冲突",
            text: `猛然间，那扇紧闭的柴门“砰”的一声被踢开了！风雨裹挟着一片冰冷的血腥味瞬间卷入，带头的那名刀客，右脸赫然挂着刚才提到的青铜刀疤。`
        },
        {
            style: "细腻情感",
            text: `他下意识地摩挲了一下指尖残留的余温，眼角微微有些酸涩。原来在长久的等待中，哪怕是最微小的风吹草动，都能在心里掀起狂澜。`
        },
        {
            style: "悬疑反转",
            text: `江面上的白雾不知为何突然泛起淡淡的幽蓝色，本该死在十年前的那声呼唤，却再次贴着他的耳廓轻轻响了起来，一字一顿。`
        }
    ];
}

function getMockErrors(text) {
    if (!text || text.length < 5) return [];
    return [
        {
            wrong: text.slice(0, Math.min(text.length, 12)),
            fix: "（建议将其润色并梳理词序，让开篇的镜头感更集中）",
            reason: "时态与主语细节有些许模糊，建议采用更加主谓明确的叙述手法。"
        }
    ];
}

function getMockForeshadows(content) {
    const results = [];
    if (content.includes("钥匙") || content.includes("锁")) {
        results.push({
            clue_title: "神秘的铜匙",
            content: "暗示后续可开启隐秘的抽屉或旧宅暗门，隐藏极深。",
            planted_at_position: "正文第3段"
        });
    }
    if (content.includes("珠") || content.includes("红")) {
        results.push({
            clue_title: "猩红血焰珠",
            content: "王家惨案的关键遗存，对特殊npc有致命吸引或惊悚效果。",
            planted_at_position: "正文第1段"
        });
    }

    if (results.length === 0) {
        results.push({
            clue_title: "未明言的承诺",
            content: "行文中隐藏着对方身份的猜测，可作后期倒叙伏笔。",
            planted_at_position: "正文后半段"
        });
    }
    return results;
}

function getMockThemeGuide(themeKey) {
    const themes = {
        rainy_detective: "深夜的雨声在窗棂上砸出杂乱无章的重音。江城巡捕房的壁炉早已熄灭，桌上那叠发黄的卷宗正散发着陈腐的霉味。探长摘下有些磨损的金丝眼镜，镜片上反射出一道自街灯斜刺进来的惨白光芒。",
        first_encounter: "石板街上的杏花雨落得正好，微风携着湿润的泥土香气扑面而来。她撑着一把洗得有些褪色的油纸伞，在转角处猛然驻足——那人的衣角被风扬起，一双深邃清澈的眼眸恰好在伞沿下与她交汇。",
        betrayal: "夕阳将两人的影子拉得极长、极薄。直到那柄泛着冷光的短刃彻底没入胸膛，他仍然不敢相信，眼前这个曾代自己挡过三千箭雨的至交好友，此刻脸上竟挂着如此平静而残忍的温润笑容。",
        reunion: "十年白衣，十载风沙。当两人在破落的边关驿站再次相对而坐，客栈外狂风呼啸。小二端上一壶劣质浊酒，两只粗糙的瓷碗碰在一起，发出了沙哑的闷响，谁也没有主动开口提当年的誓约。"
    };
    return themes[themeKey] || "大雾弥漫的清晨，江边的古渡口来了一个奇怪的旅人。他穿着一袭旧青衣，背着破烂的书笈，腰间却系着一枚刻满雷纹的青铜断简。";
}
