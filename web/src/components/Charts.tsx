import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis, RadarChart, PolarGrid, Radar, PolarAngleAxis as RadarAngle, PolarRadiusAxis, CartesianGrid, Dot, PieChart, Pie, Cell, Legend } from 'recharts'

export function TrendChart({ data, darkMode }: { data: { label: string; value: number }[]; darkMode: boolean }) {
  const stroke = darkMode ? '#5cf4ff' : '#1b4d3e'
  const fill = darkMode ? 'rgba(92, 244, 255, 0.15)' : 'rgba(27, 77, 62, 0.15)'
  return (
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} tickMargin={4} width={36} />
        <Tooltip
          cursor={{ stroke: 'var(--accent)', strokeWidth: 1 }}
          contentStyle={{ background: 'var(--panel-strong)', border: `1px solid var(--border)`, color: 'var(--text)' }}
          labelStyle={{ color: 'var(--muted)' }}
          formatter={(value: number, _name, props) => [value.toLocaleString('en-US'), props.payload?.label]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={3}
          fillOpacity={1}
          fill={fill}
          activeDot={({ cx, cy }) => <Dot cx={cx} cy={cy} r={5} fill={stroke} strokeWidth={0} />}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ProductivityRadial({ score }: { score: number }) {
  const fill = 'var(--accent)'
  return (
    <ResponsiveContainer>
      <RadialBarChart innerRadius="45%" outerRadius="100%" data={[{ name: 'score', value: score, fill }]} startAngle={220} endAngle={-40}>
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar background={{ fill: 'var(--panel-strong)' }} dataKey="value" cornerRadius={18} />
      </RadialBarChart>
    </ResponsiveContainer>
  )
}

const PIE_COLORS = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)', 'var(--success)', '#0f172a', '#b09160']

export function ActivityBreakdownPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="var(--panel)" />
          ))}
        </Pie>
        <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: 'var(--text)', fontSize: 12 }}>{value}</span>} />
        <Tooltip contentStyle={{ background: 'var(--panel-strong)', border: `1px solid var(--border)`, color: 'var(--text)' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

const STAT_COLORS: Record<string, string> = {
  STR: '#f97316',
  DEX: '#22d3ee',
  INT: '#8b5cf6',
  WIS: '#22c55e',
  CHA: '#facc15',
  VIT: '#ef4444',
}

export function PillarsRadar({ data, darkMode }: { data: { stat: string; value: number }[]; darkMode: boolean }) {
  const maxValue = Math.max(10, ...data.map((d) => d.value || 0))
  const outline = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
  const accent = data.length ? STAT_COLORS[data[0]?.stat] || 'var(--accent)' : 'var(--accent)'
  return (
    <ResponsiveContainer>
      <RadarChart data={data} outerRadius="78%">
        <PolarGrid stroke={outline} radialLines />
        <RadarAngle dataKey="stat" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, maxValue]} tick={{ fill: 'var(--muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Radar
          name="RPG"
          dataKey="value"
          stroke={accent}
          fill={accent}
          fillOpacity={0.28}
          dot={{ r: 3, stroke: 'var(--panel)', strokeWidth: 1 }}
        />
        <Tooltip
          formatter={(val, _name, payload) => {
            const stat = payload?.payload?.stat
            return [val, stat ? `${stat} (${Math.round(((val as number) / maxValue) * 100)}%)` : 'Value']
          }}
          contentStyle={{ background: 'var(--panel-strong)', border: `1px solid var(--border)`, color: 'var(--text)' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
