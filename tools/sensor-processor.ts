/**
 * Sensor Data Processing Tool
 * Collects and analyzes pressure, weather, and environmental sensor data
 */

import * as fs from 'fs';

export interface SensorReading {
  timestamp: Date;
  sensorId: string;
  sensorType: 'pressure' | 'temperature' | 'humidity' | 'altitude' | 'motion';
  value: number;
  unit: string;
  quality: number; // 0-100 signal quality
}

export interface AggregatedData {
  sensorId: string;
  readings: SensorReading[];
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
}

export interface EnvironmentalAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  sensorId: string;
  value: number;
  threshold: number;
}

export class SensorDataProcessor {
  private readings: SensorReading[] = [];
  private alerts: EnvironmentalAlert[] = [];
  private thresholds: Map<string, number> = new Map();

  constructor() {
    // Initialize default thresholds
    this.thresholds.set('pressure_high', 1050);
    this.thresholds.set('pressure_low', 950);
    this.thresholds.set('temperature_high', 40);
    this.thresholds.set('temperature_low', -10);
    this.thresholds.set('humidity_high', 90);
    this.thresholds.set('humidity_low', 20);
  }

  /**
   * Add a sensor reading
   */
  public addReading(reading: Omit<SensorReading, 'timestamp'>): void {
    this.readings.push({
      ...reading,
      timestamp: new Date(),
    });

    // Check thresholds
    this.checkThresholds(reading);
  }

  /**
   * Check if reading exceeds thresholds
   */
  private checkThresholds(reading: Omit<SensorReading, 'timestamp'>): void {
    const highThreshold = this.thresholds.get(`${reading.sensorType}_high`);
    const lowThreshold = this.thresholds.get(`${reading.sensorType}_low`);

    if (highThreshold && reading.value > highThreshold) {
      this.alerts.push({
        level: reading.value > highThreshold * 1.1 ? 'critical' : 'warning',
        message: `${reading.sensorType} exceeds high threshold`,
        timestamp: new Date(),
        sensorId: reading.sensorId,
        value: reading.value,
        threshold: highThreshold,
      });
    }

    if (lowThreshold && reading.value < lowThreshold) {
      this.alerts.push({
        level: reading.value < lowThreshold * 0.9 ? 'critical' : 'warning',
        message: `${reading.sensorType} below low threshold`,
        timestamp: new Date(),
        sensorId: reading.sensorId,
        value: reading.value,
        threshold: lowThreshold,
      });
    }
  }

  /**
   * Set custom threshold for a sensor type
   */
  public setThreshold(key: string, value: number): void {
    this.thresholds.set(key, value);
  }

  /**
   * Get aggregated statistics for a sensor
   */
  public aggregateData(sensorId: string): AggregatedData | null {
    const sensorReadings = this.readings.filter(r => r.sensorId === sensorId);

    if (sensorReadings.length === 0) {
      return null;
    }

    const values = sensorReadings.map(r => r.value);
    const average = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      sensorId,
      readings: sensorReadings,
      average,
      min: Math.min(...values),
      max: Math.max(...values),
      standardDeviation,
    };
  }

  /**
   * Get all alerts
   */
  public getAlerts(): EnvironmentalAlert[] {
    return this.alerts;
  }

  /**
   * Clear old readings (keep only last N hours)
   */
  public pruneOldReadings(hoursToKeep: number = 24): number {
    const cutoffTime = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000);
    const initialLength = this.readings.length;
    
    this.readings = this.readings.filter(r => r.timestamp > cutoffTime);
    
    return initialLength - this.readings.length;
  }

  /**
   * Export data to CSV
   */
  public exportToCSV(filename: string): string {
    const headers = ['Timestamp', 'Sensor ID', 'Type', 'Value', 'Unit', 'Quality'];
    const rows = this.readings.map(r => [
      r.timestamp.toISOString(),
      r.sensorId,
      r.sensorType,
      r.value,
      r.unit,
      r.quality,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    fs.writeFileSync(filename, csv);
    return filename;
  }

  /**
   * Get summary statistics
   */
  public getSummary(): object {
    const sensorIds = [...new Set(this.readings.map(r => r.sensorId))];
    const summary: any = {
      totalReadings: this.readings.length,
      uniqueSensors: sensorIds.length,
      timeRange: {
        start: this.readings.length > 0 ? this.readings[0].timestamp : null,
        end: this.readings.length > 0 ? this.readings[this.readings.length - 1].timestamp : null,
      },
      activeAlerts: this.alerts.filter(a => {
        const age = Date.now() - a.timestamp.getTime();
        return age < 3600000; // Last hour
      }).length,
      sensors: {},
    };

    sensorIds.forEach(id => {
      const agg = this.aggregateData(id);
      if (agg) {
        summary.sensors[id] = {
          average: agg.average.toFixed(2),
          min: agg.min,
          max: agg.max,
          stdDev: agg.standardDeviation.toFixed(2),
          readings: agg.readings.length,
        };
      }
    });

    return summary;
  }
}

export default SensorDataProcessor;
