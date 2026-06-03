'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DataPoint {
  source: string
  count: number
}

const COLORS = ['#4f6cf2', '#a25cf2', '#E8581A', '#FAC775', '#A8E6D3', '#C8B8FF']

export function TicketSourceChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="source"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ source, percent }) =>
            `${source} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [v, 'tickets']} />
      </PieChart>
    </ResponsiveContainer>
  )
}
