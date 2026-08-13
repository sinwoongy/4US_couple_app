import { useEffect, useRef, useState } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import type { GeoJsonObject, Feature } from 'geojson'
import L from 'leaflet'
import type { Layer, LeafletMouseEvent, Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeoFeatureProperties } from '../../types/trip'
import { mergeSimpleCityDistricts } from '../../utils/mergeSimpleCities'

const INDIGO_SCALE = ['#FFFFFF', '#E0E7FF', '#A5B4FC', '#818CF8', '#6366F1', '#4F46E5']

function getVisitColor(count: number): string {
  if (count === 0) return '#FFFFFF'
  return INDIGO_SCALE[Math.min(count, 5)]
}

interface Props {
  getSidoVisitCount: (code: string) => number
  getSigunguVisitCount: (code: string) => number
  onSigunguSelect: (sigunguCode: string, sigunguName: string, sidoName: string) => void
}

function MapResetButton({ selectedSido, onReset }: { selectedSido: string | null; onReset: () => void }) {
  if (!selectedSido) return null
  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <button
        onClick={onReset}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        ← 전국 지도로
      </button>
    </div>
  )
}

const KOREA_BOUNDS = [[30.5, 120.0], [42.5, 135.5]] as [[number, number], [number, number]]

function FitBoundsOnSelect({ feature }: { feature: Feature | null }) {
  const map = useMap()
  useEffect(() => {
    if (!feature) return
    try {
      const layer = L.geoJSON(feature as GeoJsonObject)
      const bounds = layer.getBounds()
      const koreaBounds = L.latLngBounds(KOREA_BOUNDS[0], KOREA_BOUNDS[1])
      const clamped = L.latLngBounds(
        [Math.max(bounds.getSouth(), koreaBounds.getSouth()), Math.max(bounds.getWest(), koreaBounds.getWest())],
        [Math.min(bounds.getNorth(), koreaBounds.getNorth()), Math.min(bounds.getEast(), koreaBounds.getEast())]
      )
      map.fitBounds(clamped, { padding: [30, 30], duration: 0.6 })
    } catch {}
  }, [feature, map])
  return null
}

function FitKorea() {
  const map = useMap()
  useEffect(() => {
    map.setView([36.5, 127.8], 7)
  }, [map])
  return null
}

function SetMaxBounds({ feature }: { feature: Feature | null }) {
  const map = useMap()
  useEffect(() => {
    if (feature) {
      const layer = L.geoJSON(feature as GeoJsonObject)
      map.setMaxBounds(layer.getBounds().pad(0.4))
    } else {
      map.setMaxBounds(L.latLngBounds(KOREA_BOUNDS[0], KOREA_BOUNDS[1]))
    }
  }, [feature, map])
  return null
}

export default function KoreaMap({ getSidoVisitCount, getSigunguVisitCount, onSigunguSelect }: Props) {
  const [sidoGeoJSON, setSidoGeoJSON] = useState<GeoJsonObject | null>(null)
  const [sigunguGeoJSON, setSigunguGeoJSON] = useState<GeoJsonObject | null>(null)
  const [selectedSido, setSelectedSido] = useState<{ code: string; name: string; feature: Feature } | null>(null)
  const [filteredSigungu, setFilteredSigungu] = useState<GeoJsonObject | null>(null)
  const [resetFlag, setResetFlag] = useState(false)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    fetch('/geojson/sido.json').then((r) => r.json()).then(setSidoGeoJSON)
    fetch('/geojson/sigungu.json')
      .then((r) => r.json())
      .then((data) => setSigunguGeoJSON(mergeSimpleCityDistricts(data)))
  }, [])

  const handleSidoClick = (feature: Feature) => {
    const props = feature.properties as GeoFeatureProperties
    setSelectedSido({ code: props.code, name: props.name, feature })

    if (sigunguGeoJSON) {
      const all = sigunguGeoJSON as GeoJSON.FeatureCollection
      const filtered: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: all.features.filter((f) => {
          const p = f.properties as GeoFeatureProperties
          return p.code.startsWith(props.code)
        }),
      }
      setFilteredSigungu(filtered)
    }
  }

  const handleReset = () => {
    setSelectedSido(null)
    setFilteredSigungu(null)
    setResetFlag((v) => !v)
  }

  const sidoStyle = (feature?: Feature) => {
    const props = feature?.properties as GeoFeatureProperties | undefined
    const count = props ? getSidoVisitCount(props.code) : 0
    return {
      fillColor: getVisitColor(count),
      weight: 1.5,
      color: '#94A3B8',
      fillOpacity: count > 0 ? 0.85 : 0.4,
    }
  }

  const sigunguStyle = (feature?: Feature) => {
    const props = feature?.properties as GeoFeatureProperties | undefined
    const count = props ? getSigunguVisitCount(props.code) : 0
    return {
      fillColor: getVisitColor(count),
      weight: 1,
      color: '#94A3B8',
      fillOpacity: count > 0 ? 0.85 : 0.3,
    }
  }

  const onEachSido = (feature: Feature, layer: Layer) => {
    const props = feature.properties as GeoFeatureProperties
    const count = getSidoVisitCount(props.code)
    const textColor = count >= 3 ? 'white' : '#1e293b'

    layer.bindTooltip(`<span style="color:${textColor}">${props.name}</span>`, {
      permanent: true,
      direction: 'center',
      className: 'leaflet-label-sido',
    })

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        const l = e.target
        l.setStyle({ weight: 2.5, color: '#6366F1', fillOpacity: count > 0 ? 0.95 : 0.6 })
        if (count > 0) {
          l.setTooltipContent(`<span style="color:${textColor}">${props.name}<br/><small>${count}번 방문</small></span>`)
        }
      },
      mouseout: (e: LeafletMouseEvent) => {
        const l = e.target
        l.setStyle(sidoStyle(feature))
        l.setTooltipContent(`<span style="color:${textColor}">${props.name}</span>`)
      },
      click: () => handleSidoClick(feature),
    })
  }

  const onEachSigungu = (feature: Feature, layer: Layer) => {
    const props = feature.properties as GeoFeatureProperties
    const count = getSigunguVisitCount(props.code)
    const textColor = count >= 3 ? 'white' : '#1e293b'

    layer.bindTooltip(`<span style="color:${textColor}">${props.name}</span>`, {
      permanent: true,
      direction: 'center',
      className: 'leaflet-label-sigungu',
    })

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        const l = e.target
        l.setStyle({ weight: 2, color: '#6366F1', fillOpacity: count > 0 ? 0.95 : 0.5 })
        if (count > 0) {
          l.setTooltipContent(`<span style="color:${textColor}">${props.name}<br/><small>${count}번 방문</small></span>`)
        }
      },
      mouseout: (e: LeafletMouseEvent) => {
        const l = e.target
        l.setStyle(sigunguStyle(feature))
        l.setTooltipContent(`<span style="color:${textColor}">${props.name}</span>`)
      },
      click: () => {
        if (selectedSido) {
          onSigunguSelect(props.code, props.name, selectedSido.name)
        }
      },
    })
  }

  return (
    <div className="relative w-full h-full bg-white">
      <MapResetButton selectedSido={selectedSido?.name ?? null} onReset={handleReset} />

      <MapContainer
        center={[36.5, 127.8]}
        zoom={7}
        style={{ height: '100%', width: '100%', background: '#FFFFFF' }}
        zoomControl={true}
        scrollWheelZoom={true}
        minZoom={7}
        maxBounds={KOREA_BOUNDS}
        maxBoundsViscosity={1.0}
        ref={mapRef}
      >
        {resetFlag !== undefined && !selectedSido && <FitKorea />}
        {selectedSido && <FitBoundsOnSelect feature={selectedSido.feature} />}
        <SetMaxBounds feature={selectedSido?.feature ?? null} />

        {!selectedSido && sidoGeoJSON && (
          <GeoJSON
            key="sido"
            data={sidoGeoJSON}
            style={sidoStyle}
            onEachFeature={onEachSido}
          />
        )}

        {selectedSido && filteredSigungu && (
          <GeoJSON
            key={`sigungu-${selectedSido.code}`}
            data={filteredSigungu}
            style={sigunguStyle}
            onEachFeature={onEachSigungu}
          />
        )}
      </MapContainer>

      {/* 범례 */}
      <div className="absolute bottom-6 right-4 z-[1000] bg-white rounded-xl shadow-md border border-gray-100 px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">방문 횟수</p>
        <div className="flex flex-col gap-1">
          {[
            { label: '미방문', color: '#FFFFFF', border: true },
            { label: '1회', color: '#E0E7FF' },
            { label: '2회', color: '#A5B4FC' },
            { label: '3회', color: '#818CF8' },
            { label: '4회', color: '#6366F1' },
            { label: '5회+', color: '#4F46E5' },
          ].map(({ label, color, border }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-sm ${border ? 'border border-gray-300' : ''}`}
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedSido && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
          {selectedSido.name} — 시·군·구를 클릭하세요
        </div>
      )}
    </div>
  )
}
