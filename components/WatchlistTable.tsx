"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WATCHLIST_TABLE_HEADER } from "@/lib/constants";
import WatchlistButton from "./WatchlistButton";
import { useRouter } from "next/navigation";
import { cn, getChangeColorClass } from "@/lib/utils";
import { CreateAlertDialog } from "./CreateAlertDialog";
import { removeAlert } from "@/lib/actions/alert.actions";
import { toast } from "sonner";
import { Button } from "./ui/button";

type AlertItem = {
  alertId: string;
  symbol: string;
};

type WatchlistTableProps = {
  watchlist: any[];
  alerts: AlertItem[]; // ✅ hydrated from backend
};

export function WatchlistTable({
  watchlist,
  alerts,
}: WatchlistTableProps) {
  const router = useRouter();

  // ✅ hydrate alertMap from backend
  const [alertMap, setAlertMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    alerts.forEach((a) => {
      map[a.symbol] = a.alertId;
    });
    return map;
  });

  // ✅ when alert created
  const handleCreated = (symbol: string, alertId: string) => {
    setAlertMap((prev) => ({
      ...prev,
      [symbol]: alertId,
    }));
  };

  // ✅ remove alert
  const handleRemove = async (symbol: string) => {
    const alertId = alertMap[symbol];
    if (!alertId) return;

    try {
      await removeAlert(alertId);

      toast.success(
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            Alert removed successfully
          </span>
          <span className="text-xs text-gray-400">
            {symbol} alert has been removed
          </span>
        </div>
      );

      setAlertMap((prev) => {
        const copy = { ...prev };
        delete copy[symbol];
        return copy;
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove alert");
    }
  };

  return (
    <Table className="scrollbar-hide-default watchlist-table">
      <TableHeader>
        <TableRow className="table-header-row">
          {WATCHLIST_TABLE_HEADER.map((label) => (
            <TableHead className="table-header" key={label}>
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {watchlist.map((item, index) => (
          <TableRow
            key={item.symbol + index}
            className="table-row"
            onClick={() =>
              router.push(`/stocks/${encodeURIComponent(item.symbol)}`)
            }
          >
            <TableCell className="pl-4 table-cell">
              {item.company}
            </TableCell>

            <TableCell className="table-cell">
              {item.symbol}
            </TableCell>

            <TableCell className="table-cell">
              {item.priceFormatted || "—"}
            </TableCell>

            <TableCell
              className={cn(
                "table-cell",
                getChangeColorClass(item.changePercent)
              )}
            >
              {item.changeFormatted || "—"}
            </TableCell>

            <TableCell className="table-cell">
              {item.marketCap || "—"}
            </TableCell>

            <TableCell className="table-cell">
              {item.peRatio || "—"}
            </TableCell>

            <TableCell onClick={(e) => e.stopPropagation()}>
              {alertMap[item.symbol] ? (
                <Button 
                onClick={() => handleRemove(item.symbol)}
                className="w-[120px] bg-[#FF824333] text-[#FF8243] hover:bg-[#e8773e] hover:text-black rounded-none">
                Remove
              </Button>
              ) : (
                <CreateAlertDialog
                  company={item.company}
                  symbol={item.symbol}
                  onCreated={(id) => handleCreated(item.symbol, id)}
                />
              )}
            </TableCell>

            <TableCell>
              <WatchlistButton
                symbol={item.symbol}
                company={item.company}
                isInWatchlist={true}
                showTrashIcon={true}
                type="icon"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}