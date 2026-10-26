import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { getIncomeReportData, getMonthReportData } from "./api";

export function useIncomeReport() {
  return useQuery({
    queryKey: queryKeys.reports.income,
    queryFn: getIncomeReportData,
  });
}

export function useMonthReport(month: string) {
  return useQuery({
    queryKey: queryKeys.reports.month(month),
    queryFn: () => getMonthReportData(month),
    enabled: /^\d{4}-(0[1-9]|1[0-2])$/.test(month),
  });
}
