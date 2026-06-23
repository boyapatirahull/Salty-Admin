'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  month: string
  tickets: number
  imports: number
}

export function TicketActivityChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart id="ticket-activity-chart" data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9B9590', fontFamily: 'DM Sans, sans-serif' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9B9590', fontFamily: 'DM Sans, sans-serif' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            fontFamily: 'DM Sans, sans-serif',
            border: '1px solid #E5E0D8',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          cursor={{ fill: '#F9F7F2' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', paddingTop: 12 }}
        />
        <Bar dataKey="tickets" name="Tickets added" fill="#E8581A" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        <Bar dataKey="imports" name="Gmail imports" fill="#C8A96E" radius={[4, 4, 0, 0]} maxBarSize={24} opacity={0.75} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
