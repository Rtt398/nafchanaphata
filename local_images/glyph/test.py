from pprint import pprint
from fontTools.ttLib import TTFont
from fontTools.otlLib.builder import LigatureSubstBuilder
from fontTools.varLib.featureVars import buildGSUB

with TTFont("build/Font-m.ttf") as font:
	builder = LigatureSubstBuilder(font, "build/Font.ttf")
	builder.ligatures[("one","d")] = "uniE001"  # "1d" を uniE001 に置換
	font["GSUB"] = buildGSUB()
	pprint(font["GSUB"].table.LookupList.Lookup)
	font["GSUB"].table.LookupList.Lookup = [builder.build()]
	font.save("liga.otf")