import { useLanguage } from '@/components/language-provider';
import { TranslationKey, getTranslation } from '@/lib/translations';

// 定义变量对象的类型 (可选但推荐)
type TranslationVariables = Record<string, string | number>;

export function useTranslation() {
  const { language } = useLanguage();

  // 修改 t 函数签名以接受可选的第二个参数 variables
  const t = (key: TranslationKey, variables?: TranslationVariables): string => {
    // 先获取基础翻译字符串
    let translation = getTranslation(language, key);

    // 如果传入了 variables 对象，则进行替换
    if (variables) {
      Object.keys(variables).forEach((varKey) => {
        // 使用正则表达式全局替换占位符，例如将 {title} 替换为实际值
        const regex = new RegExp(`{${varKey}}`, 'g');
        translation = translation.replace(regex, String(variables[varKey]));
      });
    }

    // 返回处理后的字符串
    return translation;
  };

  return { t };
}