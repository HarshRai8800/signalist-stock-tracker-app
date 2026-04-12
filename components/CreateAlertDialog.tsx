"use client";

import { useState } from "react";
import { addAlert } from "@/lib/actions/alert.actions";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateAlertDialog({
  company,
  symbol,
  onCreated,
}: {
  company: string;
  symbol: string;
  onCreated?: (alertId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [alertName, setAlertName] = useState("");
  const [type, setType] = useState("price");
  const [condition, setCondition] = useState("gt");
  const [value, setValue] = useState("");
  const [frequency, setFrequency] = useState("daily");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await addAlert({
        alertName,
        symbol,
        company,
        type: type as "price" | "percent",
        condition: condition as "gt" | "lt",
        value: Number(value),
        frequency: frequency as "5min" | "hourly" | "daily",
      });

      if (res.success) {
        toast.success(
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              Alert created successfully
            </span>
            <span className="text-xs text-gray-400">
              {company} alert has been created
            </span>
          </div>
        );

        onCreated?.(res.alertId);
        setOpen(false);
      } else {
        toast.error(
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              Alert creation failed
            </span>
            <span className="text-xs text-gray-400">
              {res.error || `Failed to create alert for ${company}`}
            </span>
          </div>
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger Button */}
      <DialogTrigger asChild>
        <Button className="w-[120px] bg-[#FF824333] text-[#FF8243] hover:bg-[#e8773e] hover:text-black rounded-none">
          Add Alert
        </Button>
      </DialogTrigger>

      {/* Dialog Content */}
      <DialogContent className="sm:max-w-md bg-zinc-900 border border-zinc-800 p-6 space-y-4 top-[55%] translate-y-[-50%]">
        
        {/* Header */}
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-white text-lg font-semibold">
            Price Alert
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 w-full">
          
          {/* Alert Name */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs text-gray-400">Alert Name</Label>
            <Input
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder="Custom name for Alert"
              className="w-full h-10 bg-zinc-800 border border-zinc-700 text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-[#FF8243]"
            />
          </div>

          {/* Stock */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs text-gray-400">Stock identifier</Label>
            <Input
              value={company}
              disabled
              className="w-full h-10 bg-zinc-800 border border-zinc-700 text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Alert Type */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs text-gray-400">Alert type</Label>
            <Select onValueChange={(val) => setType(val)}>
              <SelectTrigger className="w-full h-10 bg-zinc-800 border border-zinc-700 text-white">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="percent">% Change</SelectItem> {/* ✅ FIXED */}
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs text-gray-400">Condition</Label>
            <Select onValueChange={(val) => setCondition(val)}>
              <SelectTrigger className="w-full h-10 bg-zinc-800 border border-zinc-700 text-white">
                <SelectValue placeholder="Greater than (>)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gt">Greater than (&gt;)</SelectItem>
                <SelectItem value="lt">Less than (&lt;)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Threshold */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs text-gray-400">Threshold value</Label>
            <div className="relative w-full">
              
              {/* ✅ Dynamic Symbol */}
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E6B84F] font-semibold">
                {type === "percent" ? "%" : "$"}
              </span>

              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percent" ? "5" : "140"} // ✅ optional UX
                className="pl-7 w-full h-10 bg-zinc-800 border border-zinc-700 text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-[#FF8243]"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs text-gray-400">Frequency</Label>
            <Select onValueChange={(val) => setFrequency(val)}>
              <SelectTrigger className="w-full h-10 bg-zinc-800 border border-zinc-700 text-white">
                <SelectValue placeholder="Once per day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5min">Every 5 minutes</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Once per day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Button */}
          <div className="pt-1 w-full">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#E6B84F] hover:bg-[#d4a63f] text-black text-sm font-medium rounded-md transition-colors"
            >
              {loading ? "Creating..." : "Create Alert"}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}