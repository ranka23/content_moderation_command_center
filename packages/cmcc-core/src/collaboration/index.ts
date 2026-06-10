/**
 * CMCC Collaboration Module
 *
 * Provides types and interfaces for collaboration features including
 * moderation notes, team management, approval workflows, and activity feeds.
 *
 * @package @cmcc/core
 */

// --------------------------------------------------------------------------
// Moderation Notes
// --------------------------------------------------------------------------

/**
 * A note attached to a queue item for moderator communication.
 */
export interface ModerationNote {
  /** Unique note ID */
  id: string
  /** The queue item this note is attached to */
  itemId: string
  /** The moderator who wrote the note */
  authorId: string | number
  /** Display name of the note author */
  authorName: string
  /** Note content */
  content: string
  /** When the note was created */
  createdAt: string
  /** When the note was last updated */
  updatedAt?: string
  /** Whether this note is internal (not visible to content authors) */
  isInternal: boolean
  /** Note type */
  type: 'general' | 'question' | 'instruction' | 'resolution'
}

// --------------------------------------------------------------------------
// Team Management
// --------------------------------------------------------------------------

/**
 * Moderation team with members and permissions.
 */
export interface ModerationTeam {
  /** Unique team ID */
  id: string
  /** Team name */
  name: string
  /** Team description */
  description: string
  /** Team members */
  members: TeamMember[]
  /** Team-specific moderation permissions */
  permissions: TeamPermissions
  /** When the team was created */
  createdAt: string
  /** Whether the team is active */
  isActive: boolean
}

/**
 * Member of a moderation team.
 */
export interface TeamMember {
  /** User/Moderator ID */
  userId: string | number
  /** Display name */
  displayName: string
  /** Role within the team */
  role: 'lead' | 'senior' | 'moderator' | 'trainee'
  /** When they joined the team */
  joinedAt: string
  /** Whether the member is active */
  isActive: boolean
}

/**
 * Permissions associated with a moderation team.
 */
export interface TeamPermissions {
  /** Can approve/reject content */
  canModerate: boolean
  /** Can manage other team members */
  canManageMembers: boolean
  /** Can configure auto-moderation rules */
  canConfigureRules: boolean
  /** Can export reports */
  canExport: boolean
  /** Can view analytics */
  canViewAnalytics: boolean
  /** Can delete items permanently */
  canDelete: boolean
}

// --------------------------------------------------------------------------
// Approval Workflows
// --------------------------------------------------------------------------

/**
 * A multi-step approval workflow for sensitive content.
 */
export interface ApprovalWorkflow {
  /** Unique workflow ID */
  id: string
  /** Workflow name */
  name: string
  /** Content types this workflow applies to */
  contentTypes: string[]
  /** Steps in the approval process */
  steps: ApprovalStep[]
  /** Trigger conditions for this workflow */
  triggers: WorkflowTrigger[]
  /** Whether the workflow is active */
  isActive: boolean
}

/**
 * A single step in an approval workflow.
 */
export interface ApprovalStep {
  /** Step order (1-based) */
  order: number
  /** Step name */
  name: string
  /** Required role to complete this step */
  requiredRole: 'lead' | 'senior' | 'moderator'
  /** Action to take at this step */
  action: 'approve' | 'review' | 'escalate'
  /** Whether the step was completed */
  completed: boolean
  /** Who completed the step */
  completedBy?: string | number
  /** When the step was completed */
  completedAt?: string
}

/**
 * Conditions that trigger an approval workflow.
 */
export interface WorkflowTrigger {
  /** Trigger type */
  type: 'spam_score' | 'content_type' | 'author_reputation' | 'keyword_match'
  /** Operator for comparison */
  operator: '>' | '<' | '>=' | '<=' | '==' | 'contains'
  /** Value to compare against */
  value: string | number
}

// --------------------------------------------------------------------------
// Activity Feed
// --------------------------------------------------------------------------

/**
 * An activity feed event showing moderator actions in real-time.
 */
export interface ActivityFeedEvent {
  /** Unique event ID */
  id: string
  /** Type of event */
  type: 'action' | 'note' | 'assignment' | 'escalation' | 'team_change'
  /** The moderator who performed the action */
  actorId: string | number
  /** Display name of the actor */
  actorName: string
  /** Description of the event */
  description: string
  /** The queue item involved (if any) */
  itemId?: string
  /** The item title */
  itemTitle?: string
  /** Timestamp of the event */
  timestamp: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

// --------------------------------------------------------------------------
// Conflict Detection
// --------------------------------------------------------------------------

/**
 * Represents a conflict when two moderators try to action the same item.
 */
export interface ModerationConflict {
  /** The queue item involved */
  itemId: string
  /** Item title */
  itemTitle: string
  /** First moderator who acted */
  firstModeratorId: string | number
  /** First moderator's action */
  firstAction: string
  /** When the first action occurred */
  firstActionTime: string
  /** Second moderator who acted */
  secondModeratorId: string | number
  /** Second moderator's action */
  secondAction: string
  /** When the second action occurred */
  secondActionTime: string
  /** Severity of the conflict */
  severity: 'info' | 'warning' | 'critical'
}

// --------------------------------------------------------------------------
// Assignment System
// --------------------------------------------------------------------------

/**
 * Assignment of a queue item to a specific moderator or team.
 */
export interface ItemAssignment {
  /** The queue item ID */
  itemId: string
  /** Assigned moderator ID (null if assigned to team) */
  assigneeId?: string | number
  /** Assigned team ID (null if assigned to individual) */
  teamId?: string
  /** Who made the assignment */
  assignedById: string | number
  /** When the assignment was made */
  assignedAt: string
  /** Assignment due date (for SLA tracking) */
  dueDate?: string
  /** Current status of the assignment */
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  /** Priority level */
  priority: 'low' | 'normal' | 'high' | 'critical'
}

// --------------------------------------------------------------------------
// Defaults
// --------------------------------------------------------------------------

/**
 * Default team permissions for a new team.
 */
export function getDefaultTeamPermissions(): TeamPermissions {
  return {
    canModerate: true,
    canManageMembers: false,
    canConfigureRules: false,
    canExport: false,
    canViewAnalytics: true,
    canDelete: false,
  }
}

/**
 * Default permissions for a moderator role.
 */
export function getRolePermissions(role: TeamMember['role']): TeamPermissions {
  switch (role) {
    case 'lead':
      return {
        canModerate: true,
        canManageMembers: true,
        canConfigureRules: true,
        canExport: true,
        canViewAnalytics: true,
        canDelete: true,
      }
    case 'senior':
      return {
        canModerate: true,
        canManageMembers: false,
        canConfigureRules: true,
        canExport: true,
        canViewAnalytics: true,
        canDelete: false,
      }
    case 'moderator':
      return {
        canModerate: true,
        canManageMembers: false,
        canConfigureRules: false,
        canExport: false,
        canViewAnalytics: true,
        canDelete: false,
      }
    case 'trainee':
      return {
        canModerate: false,
        canManageMembers: false,
        canConfigureRules: false,
        canExport: false,
        canViewAnalytics: false,
        canDelete: false,
      }
  }
}

// --------------------------------------------------------------------------
// Team Manager
// --------------------------------------------------------------------------

/**
 * Manages moderation teams and their members with in-memory storage.
 */
export class TeamManager {
  private readonly teams: Map<string, ModerationTeam> = new Map()

  /**
   * Return all registered teams.
   */
  getTeams(): ModerationTeam[] {
    return Array.from(this.teams.values())
  }

  /**
   * Get a single team by ID.
   */
  getTeam(id: string): ModerationTeam | undefined {
    return this.teams.get(id)
  }

  /**
   * Create a new team with the given properties.
   * A unique ID and creation timestamp are auto-assigned.
   */
  createTeam(input: {
    name: string
    description: string
    members?: TeamMember[]
    permissions?: TeamPermissions
    isActive?: boolean
  }): ModerationTeam {
    const team: ModerationTeam = {
      id: this.generateTeamId(),
      name: input.name,
      description: input.description,
      members: input.members ?? [],
      permissions: input.permissions ?? getDefaultTeamPermissions(),
      createdAt: new Date().toISOString(),
      isActive: input.isActive ?? true,
    }

    this.teams.set(team.id, team)
    return team
  }

  /**
   * Update a team's mutable fields.
   * Returns the updated team, or undefined if the team does not exist.
   */
  updateTeam(
    id: string,
    updates: Partial<
      Pick<ModerationTeam, 'name' | 'description' | 'permissions' | 'isActive'>
    >,
  ): ModerationTeam | undefined {
    const team = this.teams.get(id)
    if (!team) return undefined

    if (updates.name !== undefined) team.name = updates.name
    if (updates.description !== undefined)
      team.description = updates.description
    if (updates.permissions !== undefined)
      team.permissions = updates.permissions
    if (updates.isActive !== undefined) team.isActive = updates.isActive

    return team
  }

  /**
   * Delete a team by ID.
   * Returns true if the team was found and removed.
   */
  deleteTeam(id: string): boolean {
    return this.teams.delete(id)
  }

  /**
   * Add a member to a team.
   * Returns true if the team was found and the member was added.
   * If the member already exists in the team, returns false.
   */
  addMember(
    teamId: string,
    member: Omit<TeamMember, 'joinedAt'> & { joinedAt?: string },
  ): boolean {
    const team = this.teams.get(teamId)
    if (!team) return false

    // Check for duplicate membership
    for (const existing of team.members) {
      if (existing.userId === member.userId) return false
    }

    const newMember: TeamMember = {
      userId: member.userId,
      displayName: member.displayName,
      role: member.role,
      joinedAt: member.joinedAt ?? new Date().toISOString(),
      isActive: member.isActive ?? true,
    }

    team.members.push(newMember)
    return true
  }

  /**
   * Remove a member from a team by user ID.
   * Returns true if the team was found and the member was removed.
   */
  removeMember(teamId: string, userId: string | number): boolean {
    const team = this.teams.get(teamId)
    if (!team) return false

    const index = team.members.findIndex((m) => m.userId === userId)
    if (index === -1) return false

    team.members.splice(index, 1)
    return true
  }

  /**
   * Change a member's role within a team.
   * Returns true if the team and member were found and the role was updated.
   */
  changeMemberRole(
    teamId: string,
    userId: string | number,
    newRole: TeamMember['role'],
  ): boolean {
    const team = this.teams.get(teamId)
    if (!team) return false

    const member = team.members.find((m) => m.userId === userId)
    if (!member) return false

    member.role = newRole
    return true
  }

  /** Generate a unique team ID. */
  private generateTeamId(): string {
    return `team_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

// --------------------------------------------------------------------------
// Assignment Manager
// --------------------------------------------------------------------------

/**
 * Manages item-to-moderator assignments with in-memory storage.
 */
export class AssignmentManager {
  private readonly assignments: Map<string, ItemAssignment> = new Map()

  /**
   * Assign an item to a moderator or team.
   */
  assignItem(assignment: ItemAssignment): void {
    this.assignments.set(assignment.itemId, assignment)
  }

  /**
   * Get an assignment by item ID.
   */
  getAssignment(itemId: string): ItemAssignment | undefined {
    return this.assignments.get(itemId)
  }

  /**
   * Mark an assignment as completed by item ID.
   * Returns true if the assignment was found and updated.
   */
  completeAssignment(itemId: string): boolean {
    const assignment = this.assignments.get(itemId)
    if (!assignment) return false

    assignment.status = 'completed'
    return true
  }

  /**
   * Get all assignments for a specific assignee.
   */
  getAssignmentsByAssignee(userId: string | number): ItemAssignment[] {
    const result: ItemAssignment[] = []
    for (const assignment of this.assignments.values()) {
      if (assignment.assigneeId === userId) {
        result.push(assignment)
      }
    }
    return result
  }

  /**
   * Get all assignments that are past their due date and not yet completed.
   */
  getOverdueAssignments(): ItemAssignment[] {
    const now = new Date()
    const result: ItemAssignment[] = []

    for (const assignment of this.assignments.values()) {
      if (assignment.status === 'completed') continue

      if (assignment.dueDate && new Date(assignment.dueDate) < now) {
        result.push(assignment)
      }
    }

    return result
  }
}

// --------------------------------------------------------------------------
// Conflict Detector
// --------------------------------------------------------------------------

/** @internal A record of a single moderation action on an item. */
interface ActionRecord {
  moderatorId: string
  action: string
  timestamp: string
}

/**
 * Detects conflicts when two moderators action the same item differently
 * within a short time window.
 */
export class ConflictDetector {
  /** Recent actions keyed by item ID. */
  private readonly actions: Map<string, ActionRecord[]> = new Map()

  /** Detected conflicts keyed by item ID. */
  private readonly conflicts: Map<string, ModerationConflict> = new Map()

  /**
   * Record a moderator action on an item.
   * Returns a ModerationConflict if another moderator already actioned this
   * item with a different action within the last 5 minutes.
   */
  recordAction(
    itemId: string,
    moderatorId: string,
    action: string,
    timestamp?: string,
  ): ModerationConflict | null {
    const ts = timestamp ?? new Date().toISOString()

    // Store the action
    const existing = this.actions.get(itemId) ?? []
    const record: ActionRecord = {
      moderatorId,
      action,
      timestamp: ts,
    }
    existing.push(record)
    this.actions.set(itemId, existing)

    // Check for conflicting actions within the last 5 minutes
    const conflictThresholdMs = 5 * 60 * 1000
    const actionTime = new Date(ts).getTime()

    for (const prev of existing) {
      if (prev === record) continue // skip the record we just added
      if (prev.moderatorId === moderatorId) continue // same moderator, no conflict
      if (prev.action === action) continue // same action, no conflict

      const prevTime = new Date(prev.timestamp).getTime()
      if (actionTime - prevTime > conflictThresholdMs) continue // outside window

      // Conflict detected
      const conflict: ModerationConflict = {
        itemId,
        itemTitle: '',
        firstModeratorId: prev.moderatorId,
        firstAction: prev.action,
        firstActionTime: prev.timestamp,
        secondModeratorId: moderatorId,
        secondAction: action,
        secondActionTime: ts,
        severity: 'warning',
      }

      this.conflicts.set(itemId, conflict)
      return conflict
    }

    return null
  }

  /**
   * Return all detected conflicts.
   */
  getConflicts(): ModerationConflict[] {
    return Array.from(this.conflicts.values())
  }

  /**
   * Resolve a conflict by item ID.
   * Returns true if the conflict was found and removed.
   */
  resolveConflict(itemId: string): boolean {
    return this.conflicts.delete(itemId)
  }
}
