from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeatures

font = TTFont("NotoSans-Regular.ttf")
cfont = TTFont("build/Font.ttf")

for table in font:
    if table2 in cfont:
        font[table] = cfont[table2]

# フォントの保存
font.save("merged_font.ttf")