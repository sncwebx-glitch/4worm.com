/**
 * Media Production Tools
 * Manages scheduling, asset organization, and post-production workflow
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ProductionSchedule {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  crew: CrewMember[];
  equipment: Equipment[];
  notes: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string; // director, cinematographer, editor, etc.
  email: string;
  phone?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string; // camera, light, microphone, etc.
  status: 'available' | 'in_use' | 'maintenance';
  location?: string;
}

export interface MediaAsset {
  id: string;
  filename: string;
  type: 'video' | 'audio' | 'image' | 'document';
  format: string;
  duration?: number; // seconds
  resolution?: string;
  filesize: number; // bytes
  createdAt: Date;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface PostProductionTask {
  id: string;
  name: string;
  description: string;
  type: 'editing' | 'color_correction' | 'audio_mixing' | 'effects' | 'review';
  status: 'pending' | 'in_progress' | 'completed';
  assignee?: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  assets: string[]; // asset IDs
  estimatedHours: number;
  actualHours?: number;
}

export class MediaProductionManager {
  private schedules: Map<string, ProductionSchedule> = new Map();
  private assets: Map<string, MediaAsset> = new Map();
  private tasks: Map<string, PostProductionTask> = new Map();
  private equipment: Map<string, Equipment> = new Map();

  /**
   * Create a production schedule
   */
  public createSchedule(schedule: Omit<ProductionSchedule, 'id'>): ProductionSchedule {
    const id = `schedule_${Date.now()}`;
    const newSchedule: ProductionSchedule = {
      ...schedule,
      id,
    };

    this.schedules.set(id, newSchedule);
    return newSchedule;
  }

  /**
   * Get schedule details
   */
  public getSchedule(scheduleId: string): ProductionSchedule | null {
    return this.schedules.get(scheduleId) || null;
  }

  /**
   * Get all schedules for a date range
   */
  public getSchedulesByDateRange(startDate: Date, endDate: Date): ProductionSchedule[] {
    return Array.from(this.schedules.values()).filter(
      s => s.startDate <= endDate && s.endDate >= startDate
    );
  }

  /**
   * Register an asset
   */
  public registerAsset(asset: Omit<MediaAsset, 'id'>): MediaAsset {
    const id = `asset_${Date.now()}`;
    const newAsset: MediaAsset = {
      ...asset,
      id,
    };

    this.assets.set(id, newAsset);
    return newAsset;
  }

  /**
   * Organize assets by tags
   */
  public getAssetsByTag(tag: string): MediaAsset[] {
    return Array.from(this.assets.values()).filter(a => a.tags.includes(tag));
  }

  /**
   * Search assets by type
   */
  public getAssetsByType(type: MediaAsset['type']): MediaAsset[] {
    return Array.from(this.assets.values()).filter(a => a.type === type);
  }

  /**
   * Get asset library summary
   */
  public getLibrarySummary(): object {
    const assets = Array.from(this.assets.values());
    const byType = assets.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalSize = assets.reduce((sum, a) => sum + a.filesize, 0);

    return {
      totalAssets: assets.length,
      byType,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      tags: [...new Set(assets.flatMap(a => a.tags))],
    };
  }

  /**
   * Create a post-production task
   */
  public createTask(task: Omit<PostProductionTask, 'id'>): PostProductionTask {
    const id = `task_${Date.now()}`;
    const newTask: PostProductionTask = {
      ...task,
      id,
    };

    this.tasks.set(id, newTask);
    return newTask;
  }

  /**
   * Update task status
   */
  public updateTaskStatus(taskId: string, status: PostProductionTask['status'], actualHours?: number): PostProductionTask | null {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return null;
    }

    task.status = status;
    if (actualHours !== undefined) {
      task.actualHours = actualHours;
    }

    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Get workflow pipeline
   */
  public getWorkflowPipeline(): object {
    const tasks = Array.from(this.tasks.values());
    const byStatus = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || []);
      acc[t.status].push(t);
      return acc;
    }, {} as Record<string, PostProductionTask[]>);

    return {
      pending: byStatus['pending']?.length || 0,
      inProgress: byStatus['in_progress']?.length || 0,
      completed: byStatus['completed']?.length || 0,
      timeline: Array.from(this.tasks.values())
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 10),
    };
  }

  /**
   * Register equipment
   */
  public registerEquipment(equipment: Omit<Equipment, 'id'>): Equipment {
    const id = `equip_${Date.now()}`;
    const newEquipment: Equipment = {
      ...equipment,
      id,
    };

    this.equipment.set(id, newEquipment);
    return newEquipment;
  }

  /**
   * Update equipment status
   */
  public updateEquipmentStatus(equipmentId: string, status: Equipment['status'], location?: string): Equipment | null {
    const equipment = this.equipment.get(equipmentId);
    
    if (!equipment) {
      return null;
    }

    equipment.status = status;
    if (location) {
      equipment.location = location;
    }

    this.equipment.set(equipmentId, equipment);
    return equipment;
  }

  /**
   * Get available equipment
   */
  public getAvailableEquipment(): Equipment[] {
    return Array.from(this.equipment.values()).filter(e => e.status === 'available');
  }

  /**
   * Generate production report
   */
  public generateProductionReport(scheduleId: string): string {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      return 'Schedule not found';
    }

    const relatedTasks = Array.from(this.tasks.values());
    const totalHours = relatedTasks.reduce((sum, t) => sum + (t.actualHours || t.estimatedHours), 0);

    const report = `
=== PRODUCTION REPORT ===
Title: ${schedule.title}
Location: ${schedule.location}
Duration: ${schedule.startDate.toDateString()} to ${schedule.endDate.toDateString()}

CREW:
${schedule.crew.map(c => `  - ${c.name} (${c.role})`).join('\n')}

EQUIPMENT:
${schedule.equipment.map(e => `  - ${e.name} (${e.type}) - ${e.status}`).join('\n')}

TASKS:
Total Tasks: ${relatedTasks.length}
Estimated Hours: ${relatedTasks.reduce((sum, t) => sum + t.estimatedHours, 0)}
Actual Hours: ${totalHours}

ASSETS:
Total Assets: ${this.assets.size}
Library Size: ${(Array.from(this.assets.values()).reduce((sum, a) => sum + a.filesize, 0) / 1024 / 1024).toFixed(2)} MB

Notes: ${schedule.notes}
=== END REPORT ===
    `;

    return report;
  }

  /**
   * Export schedule to JSON
   */
  public exportScheduleToJSON(scheduleId: string, filename: string): string {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    fs.writeFileSync(filename, JSON.stringify(schedule, null, 2));
    return filename;
  }
}

export default MediaProductionManager;
