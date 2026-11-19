import { StatusTone } from "@/components/ia/status-badge";
import { IskurWeekStatus } from "@/interfaces/iskur-weeks";

/** How a week's status reads as a badge, on every İŞKUR weekly screen. */
export const WEEK_STATUS_TONES: Record<IskurWeekStatus, StatusTone> = {
  [IskurWeekStatus.Draft]: StatusTone.Neutral,
  [IskurWeekStatus.Submitted]: StatusTone.Warning,
  [IskurWeekStatus.Approved]: StatusTone.Success,
  [IskurWeekStatus.RevisionRequested]: StatusTone.Info,
  [IskurWeekStatus.Rejected]: StatusTone.Error,
};
