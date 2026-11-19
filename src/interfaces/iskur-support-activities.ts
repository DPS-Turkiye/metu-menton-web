/** A peer program's support-activity pool (backend `IskurSupportActivitiesResponse`), kept by its coordinators. */

export interface IskurSupportActivity {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
}

export interface IskurSupportActivities {
  programId: string;
  activities: IskurSupportActivity[];
}

/** `active` null keeps the current value; a new activity starts active. */
export interface IskurSupportActivityInput {
  title: string;
  description: string | null;
  active: boolean | null;
}
