/** Randevularım's four ways to look at the same appointments (Figma: Liste · Gün · Hafta · Ay). */
export enum AppointmentsView {
  List = "list",
  Day = "day",
  Week = "week",
  Month = "month",
}

/** The list view's tabs: settled sessions ahead, requests still waiting, and everything else. */
export enum AppointmentsTab {
  Upcoming = "upcoming",
  Requests = "requests",
  Past = "past",
}

/** Taleplerim's accordion groups beside the calendar (Figma 258:3698), in the order they are listed. */
export enum AppointmentRequestGroup {
  /** A time the other side offered instead; the student answers it ("Yanıtını bekleyen öneriler"). */
  AwaitingYou = "awaitingYou",
  /** A request the academician or mentor has not answered yet ("Onay bekleyen taleplerim"). */
  AwaitingThem = "awaitingThem",
  /** Confirmed sessions ahead ("Onaylanan randevularım"). */
  Confirmed = "confirmed",
  /** Held, refused, cancelled or lapsed ("Geçmiş"). */
  Past = "past",
}
