import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.deepseek.com",
  timeout: 60000,
  maxRetries: 2,
});

export async function generateContinue(context: string): Promise<{ candidates: { id: number; style: string; content: string }[] }> {
  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个专业的小说写作助手。请根据用户提供的上下文，生成3种不同风格的续写建议。
        要求：
        1. 每种续写不超过150字
        2. 风格分别为：悬疑紧张、温情细腻、简洁明快
        3. 续写内容要与上下文衔接自然
        4. 不要生成完整的故事结局，只做承上启下的续写
        请严格用JSON格式返回：{"candidates":[{"id":1,"style":"悬疑紧张","content":"..."},{"id":2,"style":"温情细腻","content":"..."},{"id":3,"style":"简洁明快","content":"..."}]}`
      },
      {
        role: 'user',
        content: `请为以下小说内容生成3种风格的续写：\n---\n${context}\n---`
      }
    ],
    max_tokens: 600,
    temperature: 0.75,
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const parsed = JSON.parse(content)
    if (parsed.candidates && Array.isArray(parsed.candidates)) return parsed
  } catch {}
  return { candidates: [] }
}

export async function validateText(text: string): Promise<{ errors: any[] }> {
  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个专业的中文写作纠错助手。请检查用户文本，识别语法、逻辑、标点、表达问题。
        对每个错误返回：startIndex(字符索引)、endIndex、type(grammar/logic/punctuation/expression)、message、suggestion。
        请严格用JSON格式返回：{"errors":[{"id":1,"startIndex":0,"endIndex":5,"type":"grammar","message":"错误描述","suggestion":"修改建议"}]}
        如果没有错误，返回：{"errors":[]}`
      },
      {
        role: 'user',
        content: `请检查以下文本的错误：\n\n${text}`
      }
    ],
    max_tokens: 1000,
    temperature: 0.3,
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const parsed = JSON.parse(content)
    if (parsed.errors && Array.isArray(parsed.errors)) return parsed
  } catch {}
  return { errors: [] }
}

export async function extractForeshadowings(text: string): Promise<{ foreshadowings: any[] }> {
  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个专业的小说伏笔分析助手。请从文本中提取伏笔线索。
        伏笔通常出现在：转折词后（但是、其实、实际上、后来才发现）、细节描写中、人物言行中、环境描写中。
        对每个伏笔返回：content(伏笔内容)、keywords(关键词数组)、position_index(字符位置)。
        请严格用JSON格式返回：{"foreshadowings":[{"content":"伏笔内容","keywords":["关键词1"],"position_index":10}]}
        如果没有伏笔，返回：{"foreshadowings":[]}`
      },
      {
        role: 'user',
        content: `请从以下文本中提取伏笔：\n\n${text}`
      }
    ],
    max_tokens: 1000,
    temperature: 0.5,
  })

  const content = response.choices[0]?.message?.content || ''
  try {
    const parsed = JSON.parse(content)
    if (parsed.foreshadowings && Array.isArray(parsed.foreshadowings)) return parsed
  } catch {}
  return { foreshadowings: [] }
}

export async function generateThemePrompt(theme: string): Promise<{ prompt: string }> {
  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个专业的小说场景引导助手。请根据主题生成200字以内的场景引导语，激发写作灵感，包含氛围描写和开场情境，语言优美有画面感。`
      },
      {
        role: 'user',
        content: `请为"${theme}"主题生成一段场景引导语（200字以内）。`
      }
    ],
    max_tokens: 400,
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content || ''
  return { prompt: content }
}

export async function styleCheck(text: string, theme: string): Promise<{ feedback: string }> {
  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个专业的小说风格指导助手。请检查用户文本是否符合所选主题的风格要求，检查：整体氛围、人物描写、情节发展、语言节奏。给出具体改进建议。`
      },
      {
        role: 'user',
        content: `请检查以下文本是否符合"${theme}"主题的风格要求：\n\n${text}`
      }
    ],
    max_tokens: 800,
    temperature: 0.5,
  })

  const content = response.choices[0]?.message?.content || ''
  return { feedback: content }
}

export default openai;