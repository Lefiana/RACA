// File: apps/frontend/app/(dashboard)/requests/new/page.tsx
// Purpose: Multi-section RACA request creation form with adviser + approval group selection
// Dependencies: useCreateRequest, useSubmitRequest, useAdvisers, useRouter
'use client';

import { useState }          from 'react';
import { useRouter }         from 'next/navigation';
import { useCreateRequest, useSubmitRequest } from '../../../lib/requests/hooks';
import { useAdvisers }       from '../../../lib/users/hooks';
import { APPROVAL_GROUP_OPTIONS } from '../../../lib/requests/constants';
import type { ICreateRequestDto, ISpeaker, ApprovalGroup } from '../../../lib/requests/types';

export default function NewRequestPage() {
  const router        = useRouter();
  const createRequest = useCreateRequest();
  const submitRequest = useSubmitRequest();
  const { data: advisersData, isLoading: advisersLoading } = useAdvisers();

  const [selectedAdviserId, setSelectedAdviserId] = useState<string>('');
  const [adviserError, setAdviserError]           = useState<string>('');

  // ── NEW: Approval group selection ────────────────────────────────────────
  const [selectedApprovalGroup, setSelectedApprovalGroup] = useState<ApprovalGroup | ''>('');
  const [approvalGroupError, setApprovalGroupError]       = useState<string>('');

  const [form, setForm] = useState<ICreateRequestDto>({
    activityTitle:   '',
    objectives:      '',
    activityStartAt: '',
    activityEndAt:   '',
    theme:           '',
    venueDescription: '',
    equipmentDescription: '',
    expectedAudience: '',
    expectedHeadcount: undefined,
    remarks:         '',
    speakers:        [],
    venues:          [],
    assets:          [],
    approvalGroup:   '' as ApprovalGroup, // Will be set on submit
  });

  const [speakers, setSpeakers] = useState<ISpeaker[]>([]);

  const set = (field: keyof ICreateRequestDto) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const addSpeaker = () =>
    setSpeakers(prev => [...prev, { name: '', position: '', organization: '' }]);

  const updateSpeaker = (i: number, field: keyof ISpeaker, value: string) =>
    setSpeakers(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const removeSpeaker = (i: number) =>
    setSpeakers(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async (andSubmit = false) => {
    // ── NEW: Validate approval group is selected ───────────────────────────
    if (andSubmit && !selectedApprovalGroup) {
      setApprovalGroupError('Please select an approval group before submitting.');
      return;
    }
    setApprovalGroupError('');

    if (andSubmit && !selectedAdviserId) {
      setAdviserError('Please select an adviser before submitting.');
      return;
    }
    setAdviserError('');

    const dto: ICreateRequestDto = {
      ...form,
      speakers,
      expectedHeadcount: form.expectedHeadcount
        ? Number(form.expectedHeadcount)
        : undefined,
      approvalGroup: selectedApprovalGroup as ApprovalGroup,
    };

    const request = await createRequest.mutateAsync(dto);

    if (andSubmit) {
      await submitRequest.mutateAsync({ id: request.id, adviserId: selectedAdviserId });
    }

    router.push(`/requests/${request.id}`);
  };

  const isLoading = createRequest.isPending || submitRequest.isPending;
  const isFormInvalid = !form.activityTitle || !form.objectives || !form.activityStartAt || !form.activityEndAt;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Request</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Request for Approval of Campus Activity
        </p>
      </div>

      {/* ── NEW: Approval Group selection ───────────────────────────────────── */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <label htmlFor="approval-group-select" className="block text-sm font-semibold text-foreground uppercase tracking-wide">
          Select Approval Group
        </label>
        <p className="text-sm text-muted-foreground">
          Choose the department group that will route this request to the correct Department Head.
        </p>

        <select
          id="approval-group-select"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={selectedApprovalGroup}
          onChange={e => {
            setSelectedApprovalGroup(e.target.value as ApprovalGroup);
            setApprovalGroupError('');
          }}
        >
          <option value="">— Select an approval group —</option>
          {APPROVAL_GROUP_OPTIONS.map(group => (
            <option key={group.value} value={group.value}>
              {group.label}
            </option>
          ))}
        </select>

        {approvalGroupError && (
          <p className="text-sm text-destructive font-medium">{approvalGroupError}</p>
        )}

        {selectedApprovalGroup && (
          <p className="text-xs text-muted-foreground">
            {APPROVAL_GROUP_OPTIONS.find(g => g.value === selectedApprovalGroup)?.description}
          </p>
        )}
      </section>

      {/* Adviser selection */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <label htmlFor="adviser-select" className="block text-sm font-semibold text-foreground uppercase tracking-wide">
          Select Your Adviser
        </label>
        <p className="text-sm text-muted-foreground">
          Choose the faculty adviser who will review this request first.
        </p>

        {advisersLoading ? (
          <p className="text-sm text-muted-foreground">Loading advisers...</p>
        ) : (
          <select
            id="adviser-select"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={selectedAdviserId}
            onChange={e => {
              setSelectedAdviserId(e.target.value);
              setAdviserError('');
            }}
          >
            <option value="">— Select an adviser —</option>
            {advisersData?.data?.map(adviser => (
              <option key={adviser.id} value={adviser.id}>
                {adviser.name}
                {adviser.department ? ` (${adviser.department})` : ''}
              </option>
            ))}
          </select>
        )}

        {adviserError && (
          <p className="text-sm text-destructive font-medium">{adviserError}</p>
        )}
      </section>

      {/* Section I — Activity Info */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Section I — Activity Information
        </h2>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Activity Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.activityTitle}
            onChange={set('activityTitle')}
            placeholder="e.g. JS Prom Night 2025"
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Theme</label>
          <input
            type="text"
            value={form.theme ?? ''}
            onChange={set('theme')}
            placeholder="e.g. A Night to Remember"
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </section>

      {/* Section II — Objectives */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Section II — Objectives
        </h2>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Objectives <span className="text-destructive">*</span>
          </label>
          <textarea
            value={form.objectives}
            onChange={set('objectives')}
            rows={4}
            placeholder="Describe the goals and purpose of this activity..."
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </section>

    {/* Section III — Schedule */}
    <section className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
        Section III — Schedule
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="start-date-time" className="block text-sm font-medium text-foreground">
            Start Date & Time <span className="text-destructive">*</span>
          </label>
          <input
            id="start-date-time"
            type="datetime-local"
            value={form.activityStartAt}
            onChange={set('activityStartAt')}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="end-date-time" className="block text-sm font-medium text-foreground">
            End Date & Time <span className="text-destructive">*</span>
          </label>
          <input
            id="end-date-time"
            type="datetime-local"
            value={form.activityEndAt}
            onChange={set('activityEndAt')}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </section>

      {/* Section IV — Venue & Equipment */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Section IV — Venue & Equipment
        </h2>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Venue Description</label>
          <textarea
            value={form.venueDescription ?? ''}
            onChange={set('venueDescription')}
            rows={2}
            placeholder="Describe venue requirements..."
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Equipment Description</label>
          <textarea
            value={form.equipmentDescription ?? ''}
            onChange={set('equipmentDescription')}
            rows={2}
            placeholder="List required equipment..."
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </section>

      {/* Section V — Speakers */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Section V — Speakers / Resource Persons
          </h2>
          <button
            type="button"
            onClick={addSpeaker}
            className="text-xs text-primary hover:underline"
          >
            + Add Speaker
          </button>
        </div>

        {speakers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No speakers added yet.</p>
        ) : (
          <div className="space-y-3">
            {speakers.map((speaker, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 p-3 border border-border rounded-md bg-muted/30">
                <input
                  type="text"
                  value={speaker.name}
                  onChange={e => updateSpeaker(i, 'name', e.target.value)}
                  placeholder="Full name *"
                  className="px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="text"
                  value={speaker.position ?? ''}
                  onChange={e => updateSpeaker(i, 'position', e.target.value)}
                  placeholder="Position"
                  className="px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={speaker.organization ?? ''}
                    onChange={e => updateSpeaker(i, 'organization', e.target.value)}
                    placeholder="Organization"
                    className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpeaker(i)}
                    className="text-destructive hover:text-destructive/80 text-xs px-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section VI — Audience */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Section VI — Expected Audience
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Audience Description</label>
            <input
              type="text"
              value={form.expectedAudience ?? ''}
              onChange={set('expectedAudience')}
              placeholder="e.g. All BSIT students"
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Expected Headcount</label>
            <input
              type="number"
              value={form.expectedHeadcount ?? ''}
              onChange={set('expectedHeadcount')}
              placeholder="e.g. 150"
              min={1}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Remarks</label>
          <textarea
            value={form.remarks ?? ''}
            onChange={set('remarks')}
            rows={2}
            placeholder="Any additional notes..."
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </section>

      {/* Error */}
      {(createRequest.isError || submitRequest.isError) && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">
            Failed to save request. Please check all required fields and try again.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isLoading}
          className="px-4 py-2 text-sm border border-input rounded-md bg-background hover:bg-muted disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isLoading || isFormInvalid}
          className="px-4 py-2 text-sm border border-input rounded-md bg-background hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {createRequest.isPending ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={isLoading || isFormInvalid || !selectedAdviserId || !selectedApprovalGroup}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Submitting...' : 'Save & Submit'}
        </button>
      </div>
    </div>
  );
}