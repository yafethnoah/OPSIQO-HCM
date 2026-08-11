import { describe, expect, it } from 'vitest';
import { renderNotificationTemplate } from '@/lib/notifications/service';
import type { NotificationTemplate } from '@/domain/notifications';
const template:NotificationTemplate={id:'t1',code:'TASK_OVERDUE',name:'Task overdue',subject:'Action for {{workerName}}',body:'{{taskTitle}} is overdue for {{workerName}}.',channels:['in_app'],variables:['workerName','taskTitle'],enabled:true,createdBy:'u1',createdAt:'2026-08-10T00:00:00Z',updatedBy:'u1',updatedAt:'2026-08-10T00:00:00Z'};
describe('lifecycle notification templates',()=>{
  it('renders declared lifecycle variables',()=>{expect(renderNotificationTemplate(template,{workerName:'Taylor',taskTitle:'Verify documents'})).toEqual({title:'Action for Taylor',message:'Verify documents is overdue for Taylor.'});});
  it('fails closed when a required value is missing',()=>{expect(()=>renderNotificationTemplate(template,{workerName:'Taylor'})).toThrow(/Missing notification template value/);});
});
