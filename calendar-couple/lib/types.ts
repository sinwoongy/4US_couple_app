export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  note: string;
  color: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  createdAt: string;
};

export type Trip = {
  id: string;
  sido: string;
  sidoCode: string;
  sigungu: string;
  sigunguCode: string;
  dateFrom: string;
  dateTo: string;
  places: string[];
  food: string;
  impression: string;
  rating: number;
  tags: string[];
  createdBy: string;
  createdAt: string;
};

export type GeoFeatureProperties = {
  code: string;
  name: string;
  name_eng: string;
  base_year: string;
};

export type CoupleState = {
  partnerOneName: string;
  partnerTwoName: string;
  anniversaryDate: string;
  events: CalendarEvent[];
  updatedAt: string;
};
