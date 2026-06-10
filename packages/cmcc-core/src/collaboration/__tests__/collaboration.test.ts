/**
 * Unit tests for CMCC Collaboration module
 */

import {
  TeamManager,
  AssignmentManager,
  ConflictDetector,
  getDefaultTeamPermissions,
  getRolePermissions,
  type TeamMember,
  type ItemAssignment,
} from '../index'

describe('getDefaultTeamPermissions()', () => {
  it('returns appropriate default permissions', () => {
    const perms = getDefaultTeamPermissions()
    expect(perms.canModerate).toBe(true)
    expect(perms.canManageMembers).toBe(false)
    expect(perms.canConfigureRules).toBe(false)
    expect(perms.canExport).toBe(false)
    expect(perms.canViewAnalytics).toBe(true)
    expect(perms.canDelete).toBe(false)
  })
})

describe('getRolePermissions()', () => {
  it('lead has all permissions', () => {
    const perms = getRolePermissions('lead')
    expect(perms.canModerate).toBe(true)
    expect(perms.canManageMembers).toBe(true)
    expect(perms.canDelete).toBe(true)
  })

  it('trainee has read-only permissions', () => {
    const perms = getRolePermissions('trainee')
    expect(perms.canModerate).toBe(false)
    expect(perms.canManageMembers).toBe(false)
    expect(perms.canConfigureRules).toBe(false)
    expect(perms.canDelete).toBe(false)
    expect(perms.canViewAnalytics).toBe(false)
    expect(perms.canExport).toBe(false)
  })
})

describe('TeamManager', () => {
  let tm: TeamManager

  beforeEach(() => {
    tm = new TeamManager()
  })

  it('creates a team', () => {
    const team = tm.createTeam({ name: 'Moderators', description: 'Main team' })
    expect(team.name).toBe('Moderators')
    expect(team.members).toHaveLength(0)
    expect(team.isActive).toBe(true)
  })

  it('returns all teams', () => {
    tm.createTeam({ name: 'Team A', description: '' })
    tm.createTeam({ name: 'Team B', description: '' })
    expect(tm.getTeams()).toHaveLength(2)
  })

  it('gets a team by id', () => {
    const created = tm.createTeam({ name: 'My Team', description: '' })
    const found = tm.getTeam(created.id)
    expect(found).toBeDefined()
    expect(found!.name).toBe('My Team')
  })

  it('updates a team', () => {
    const created = tm.createTeam({ name: 'Original', description: '' })
    const updated = tm.updateTeam(created.id, { name: 'Updated' })
    expect(updated).toBeDefined()
    expect(tm.getTeam(created.id)!.name).toBe('Updated')
  })

  it('deletes a team', () => {
    const created = tm.createTeam({ name: 'To Delete', description: '' })
    const deleted = tm.deleteTeam(created.id)
    expect(deleted).toBe(true)
    expect(tm.getTeam(created.id)).toBeUndefined()
  })

  it('adds a member to a team', () => {
    const team = tm.createTeam({ name: 'Team', description: '' })
    const added = tm.addMember(team.id, {
      userId: 'user-1',
      displayName: 'Alice',
      role: 'moderator' as TeamMember['role'],
      isActive: true,
    })
    expect(added).toBe(true)
    expect(tm.getTeam(team.id)!.members).toHaveLength(1)
  })

  it('removes a member from a team', () => {
    const team = tm.createTeam({ name: 'Team', description: '' })
    tm.addMember(team.id, {
      userId: 'user-1',
      displayName: 'Alice',
      role: 'moderator' as TeamMember['role'],
      isActive: true,
    })
    const removed = tm.removeMember(team.id, 'user-1')
    expect(removed).toBe(true)
    expect(tm.getTeam(team.id)!.members).toHaveLength(0)
  })

  it('changes a member role', () => {
    const team = tm.createTeam({ name: 'Team', description: '' })
    tm.addMember(team.id, {
      userId: 'user-1',
      displayName: 'Alice',
      role: 'moderator' as TeamMember['role'],
      isActive: true,
    })
    const changed = tm.changeMemberRole(team.id, 'user-1', 'lead')
    expect(changed).toBe(true)
    expect(tm.getTeam(team.id)!.members[0]!.role).toBe('lead')
  })
})

describe('AssignmentManager', () => {
  let am: AssignmentManager

  beforeEach(() => {
    am = new AssignmentManager()
  })

  it('assigns an item to a moderator', () => {
    const assignment: ItemAssignment = {
      itemId: 'item-1',
      assigneeId: 'mod-1',
      assignedById: 'mod-alice',
      assignedAt: new Date().toISOString(),
      status: 'pending',
      priority: 'normal',
    }
    am.assignItem(assignment)
    const found = am.getAssignment('item-1')
    expect(found).toBeDefined()
    expect(found!.itemId).toBe('item-1')
    expect(found!.assigneeId).toBe('mod-1')
  })

  it('completes an assignment', () => {
    const assignment: ItemAssignment = {
      itemId: 'item-1',
      assigneeId: 'mod-1',
      assignedById: 'mod-alice',
      assignedAt: new Date().toISOString(),
      status: 'pending',
      priority: 'normal',
    }
    am.assignItem(assignment)
    const completed = am.completeAssignment('item-1')
    expect(completed).toBe(true)
    const found = am.getAssignment('item-1')
    expect(found!.status).toBe('completed')
  })

  it('returns assignments by assignee', () => {
    const base: Omit<ItemAssignment, 'itemId'> = {
      assigneeId: 'mod-1',
      assignedById: 'admin',
      assignedAt: new Date().toISOString(),
      status: 'pending',
      priority: 'normal',
    }
    am.assignItem({ ...base, itemId: 'a' })
    am.assignItem({ ...base, itemId: 'b' })
    expect(am.getAssignmentsByAssignee('mod-1')).toHaveLength(2)
  })

  it('returns overdue assignments', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const assignment: ItemAssignment = {
      itemId: 'overdue-item',
      assigneeId: 'mod-1',
      assignedById: 'admin',
      assignedAt: yesterday,
      dueDate: yesterday,
      status: 'pending',
      priority: 'normal',
    }
    am.assignItem(assignment)
    const overdue = am.getOverdueAssignments()
    expect(overdue.length).toBeGreaterThanOrEqual(1)
    expect(overdue[0]!.itemId).toBe('overdue-item')
  })
})

describe('ConflictDetector', () => {
  let cd: ConflictDetector

  beforeEach(() => {
    cd = new ConflictDetector()
  })

  it('detects conflicts when two moderators act on the same item quickly', () => {
    cd.recordAction('item-1', 'mod-1', 'approve', new Date().toISOString())
    cd.recordAction('item-1', 'mod-2', 'reject', new Date().toISOString())

    const conflicts = cd.getConflicts()
    expect(conflicts.length).toBeGreaterThanOrEqual(1)
    expect(conflicts[0]!.itemId).toBe('item-1')
    expect(conflicts[0]!.firstModeratorId).toBe('mod-1')
    expect(conflicts[0]!.secondModeratorId).toBe('mod-2')
  })

  it('resolves a conflict', () => {
    cd.recordAction('item-1', 'mod-1', 'approve', new Date().toISOString())
    cd.recordAction('item-1', 'mod-2', 'reject', new Date().toISOString())

    const resolved = cd.resolveConflict('item-1')
    expect(resolved).toBe(true)
    expect(cd.getConflicts()).toHaveLength(0)
  })
})
