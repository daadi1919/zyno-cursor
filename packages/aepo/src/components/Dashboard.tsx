import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DashboardService } from '../services/dashboard';
import { Alert } from '../services/monitoring';

interface DashboardProps {
  dashboardService: DashboardService;
}

export const Dashboard: React.FC<DashboardProps> = ({ dashboardService }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');

  useEffect(() => {
    const updateMetrics = async () => {
      await dashboardService.updateMetrics();
      const data = await dashboardService.getDashboardMetrics();
      setMetrics(data);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 60000); // Mise à jour toutes les minutes

    return () => clearInterval(interval);
  }, [dashboardService]);

  if (!metrics) {
    return <div>Chargement...</div>;
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatValue = (value: number) => {
    return value.toFixed(2);
  };

  const renderChart = (data: any[], dataKey: string, name: string, color: string) => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatTimestamp}
        />
        <YAxis />
        <Tooltip
          labelFormatter={formatTimestamp}
          formatter={(value: number) => [formatValue(value), name]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderAlert = (alert: Alert) => (
    <div
      key={alert.timestamp}
      className={`alert alert-${alert.type} p-3 mb-2`}
    >
      <h5>{alert.message}</h5>
      <p>
        <strong>Métrique:</strong> {alert.metric}
        <br />
        <strong>Valeur:</strong> {formatValue(alert.value)}
        <br />
        <strong>Seuil:</strong> {formatValue(alert.threshold)}
        <br />
        <strong>Date:</strong> {new Date(alert.timestamp).toLocaleString()}
      </p>
    </div>
  );

  return (
    <div className="dashboard p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Tableau de bord</h2>
        <div className="btn-group">
          <button
            className={`btn ${timeRange === '1h' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setTimeRange('1h')}
          >
            1h
          </button>
          <button
            className={`btn ${timeRange === '6h' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setTimeRange('6h')}
          >
            6h
          </button>
          <button
            className={`btn ${timeRange === '24h' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setTimeRange('24h')}
          >
            24h
          </button>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Requêtes actives</h5>
              <p className="card-text display-4">{metrics.activeQueries}</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total requêtes</h5>
              <p className="card-text display-4">{metrics.totalQueries}</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Taux d'erreur</h5>
              <p className="card-text display-4">
                {(metrics.errorRate[metrics.errorRate.length - 1]?.value * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Taux de hits cache</h5>
              <p className="card-text display-4">
                {(metrics.cacheHitRate[metrics.cacheHitRate.length - 1]?.value * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Temps de réponse</h5>
              {renderChart(metrics.responseTime, 'value', 'Temps de réponse (ms)', '#8884d8')}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Utilisation des tokens</h5>
              {renderChart(metrics.tokenUsage, 'value', 'Tokens', '#82ca9d')}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Taux d'erreur</h5>
              {renderChart(metrics.errorRate, 'value', 'Taux d\'erreur', '#ff7300')}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Taux de hits cache</h5>
              {renderChart(metrics.cacheHitRate, 'value', 'Taux de hits', '#0088fe')}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Alertes récentes</h5>
              {metrics.recentAlerts.map(renderAlert)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 