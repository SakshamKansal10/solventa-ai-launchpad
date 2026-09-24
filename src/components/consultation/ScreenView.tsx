import type { ComponentType } from "react";

import type { ScreenKey } from "@/lib/consultation/model";
import { DomainsScreen, ExecutionScreen, SkillsScreen } from "./CapabilityScreens";
import {
  BasicsScreen,
  EducationScreen,
  LanguagesTimeScreen,
  LocationScreen,
} from "./FoundationScreens";
import {
  CommitmentScreen,
  ConstraintsScreen,
  IncomeHopeScreen,
  InterestsScreen,
  RefuseRelocationScreen,
  RiskRolesScreen,
  ScaleHorizonScreen,
} from "./LaterScreens";
import { AccessScreen, CapitalScreen, PositionScreen } from "./ResourceScreens";

export const SCREEN_COMPONENTS: Record<ScreenKey, ComponentType> = {
  basics: BasicsScreen,
  location: LocationScreen,
  education: EducationScreen,
  languagesTime: LanguagesTimeScreen,
  skills: SkillsScreen,
  domains: DomainsScreen,
  execution: ExecutionScreen,
  capital: CapitalScreen,
  access: AccessScreen,
  position: PositionScreen,
  riskRoles: RiskRolesScreen,
  commitment: CommitmentScreen,
  interests: InterestsScreen,
  refuseRelocation: RefuseRelocationScreen,
  constraints: ConstraintsScreen,
  scaleHorizon: ScaleHorizonScreen,
  incomeHope: IncomeHopeScreen,
};

export function ScreenView({ screenKey }: { screenKey: ScreenKey }) {
  const Component = SCREEN_COMPONENTS[screenKey];
  return <Component />;
}
