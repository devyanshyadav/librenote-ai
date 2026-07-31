import { useQuery } from "@tanstack/react-query";
import { projectClient } from "@/tanstack/clients/project.client";

export const useAssistants = () =>
  useQuery({
    queryKey: ["assistants"],
    queryFn: () => projectClient.getAssistants(),
    select: (apiData) => apiData.data?.assistants || [],
  });
