import { useState } from 'react'
import { mockTrips } from '../data/mockTrips'
import type { Trip } from '../types/trip'

function countUniquePeriods(trips: Trip[]): number {
  const periods = new Set(trips.map((t) => `${t.dateFrom}~${t.dateTo}`))
  return periods.size
}

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>(mockTrips)

  const getTripsForSigungu = (sigunguCode: string) =>
    trips.filter((t) => t.sigunguCode === sigunguCode)

  const getSidoVisitCount = (sidoCode: string) =>
    countUniquePeriods(trips.filter((t) => t.sidoCode === sidoCode))

  const getSigunguVisitCount = (sigunguCode: string) =>
    countUniquePeriods(trips.filter((t) => t.sigunguCode === sigunguCode))

  const addTrip = (trip: Omit<Trip, 'id' | 'createdAt' | 'createdBy'>) => {
    const newTrip: Trip = {
      ...trip,
      id: Date.now().toString(),
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    }
    setTrips((prev) => [newTrip, ...prev])
  }

  const updateTrip = (id: string, updates: Omit<Trip, 'id' | 'createdAt' | 'createdBy'>) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const deleteTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id))
  }

  return { trips, getTripsForSigungu, getSidoVisitCount, getSigunguVisitCount, addTrip, updateTrip, deleteTrip }
}
