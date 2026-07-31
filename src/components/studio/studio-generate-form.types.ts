import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { StudioGenerateOptions } from "@/types";

export type StudioGenerateFormHandle = {
  getOptions: () => StudioGenerateOptions;
  isValid: () => boolean;
  reset: () => void;
};

export type StudioGenerateFormProps = {
  disabled?: boolean;
};

export type StudioGenerateFormComponent = ForwardRefExoticComponent<
  StudioGenerateFormProps & RefAttributes<StudioGenerateFormHandle>
>;

export type StudioGenerateFormEntry = {
  title: string;
  description: string;
  Form: StudioGenerateFormComponent;
};
