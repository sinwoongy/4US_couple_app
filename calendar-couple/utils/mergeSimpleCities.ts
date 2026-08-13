import union from "@turf/union";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type { GeoFeatureProperties } from "@/lib/types";

const METRO_SIDO_CODES = new Set(["11", "21", "22", "23", "24", "25", "26", "29"]);

const CITY_NAME_OVERRIDES: Record<string, string> = {
  "3701": "포항시",
  "3811": "창원시",
};

function extractCityName(names: string[]): string | null {
  for (const name of names) {
    const match = name.match(/^(.+?시)/);
    if (match) return match[1];
  }
  return null;
}

export function mergeSimpleCityDistricts(geojson: FeatureCollection): FeatureCollection {
  const groups = new Map<string, Feature<Polygon | MultiPolygon>[]>();

  for (const feature of geojson.features as Feature<Polygon | MultiPolygon>[]) {
    const props = feature.properties as GeoFeatureProperties;
    const sidoCode = props.code.slice(0, 2);
    const groupKey = METRO_SIDO_CODES.has(sidoCode) ? props.code : props.code.slice(0, 4);
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(feature);
  }

  const merged: Feature[] = [];

  for (const [groupKey, features] of groups) {
    if (features.length === 1) {
      merged.push(features[0]);
      continue;
    }

    const cityName =
      CITY_NAME_OVERRIDES[groupKey] ??
      extractCityName(features.map((f) => (f.properties as GeoFeatureProperties).name)) ??
      groupKey;

    const collection: FeatureCollection<Polygon | MultiPolygon> = {
      type: "FeatureCollection",
      features: features as Feature<Polygon | MultiPolygon>[],
    };
    const united = union(collection) ?? features[0];

    merged.push({
      ...united,
      properties: {
        code: groupKey + "0",
        name: cityName,
        name_eng: "",
        base_year: "2012",
      } satisfies GeoFeatureProperties,
    });
  }

  return { type: "FeatureCollection", features: merged };
}
