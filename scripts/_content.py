import re, json
src = open('src/utils/elements.js', encoding='utf-8').read()
items = re.findall(r"'(\w+)': \{ name: '([^']+)', number: (\d+), color: '[^']+', meaning: '((?:[^'\\]|\\.)*)' \}", src)
print(len(items))
content = {k: m.replace("\\'", "'") for k, n, num, m in items}
json.dump({'elements': content}, open('src/locales/content/en.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
