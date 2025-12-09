import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

export default function TrendChart({
  title,
  labels = [],
  values = [],
  type = "line", // "line" | "bar"
}) {
  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: values,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 10 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 10 } },
        grid: { color: "rgba(148,163,253,0.08)" },
      },
    },
  };

  const ChartComponent = type === "bar" ? Bar : Line;

  return (
    <div className="w-full h-56 p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm">
      <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>
      <ChartComponent data={data} options={options} />
    </div>
  );
}
