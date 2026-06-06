import React, { useState, useEffect, useCallback } from 'react'
import {
  Layout,
  HeaderLayout,
  ContentLayout,
  TabGroup,
  Tabs,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  Typography,
  Button,
  Flex,
  Grid,
  GridItem,
  Divider,
  Status,
  Loader,
  EmptyStateLayout,
  Alert,
} from '@strapi/design-system'
import { useFetchClient, useNotification } from '@strapi/helper-plugin'
import { Illo } from '@strapi/icons'
import { QueueTable, HeatmapChart, SettingsForm, ActionButton } from '@cmcc/ui'
import pluginId from '../../pluginId'

const INITIAL_STATE = {
  queueItems: [],
  queuePagination: null,
  analytics: null,
  activityLog: [],
  activityLogPagination: null,
  settings: null,
}

const App = () => {
  const [currentTab, setCurrentTab] = useState(0)
  const [state, setState] = useState(INITIAL_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { get, post, put } = useFetchClient()
  const toggleNotification = useNotification()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const tabEndpoints = [
        { tab: 0, key: 'queueItems', url: `/${pluginId}/queue` },
        { tab: 1, key: 'analytics', url: `/${pluginId}/analytics` },
        { tab: 2, key: 'activityLog', url: `/${pluginId}/activity-log` },
        { tab: 3, key: 'settings', url: `/${pluginId}/settings` },
      ]

      const promises = tabEndpoints.map(({ url }) =>
        get(url)
          .then((res) => res.data)
          .catch(() => null),
      )

      const [queueRes, analyticsRes, activityRes, settingsRes] =
        await Promise.all(promises)

      setState((prev) => ({
        ...prev,
        queueItems: queueRes?.data || [],
        queuePagination: queueRes?.pagination || null,
        analytics: analyticsRes?.data || null,
        activityLog: activityRes?.data || [],
        activityLogPagination: activityRes?.pagination || null,
        settings: settingsRes?.data || null,
      }))
    } catch (err) {
      setError(err.message || 'Failed to load plugin data')
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleModerate = async (id, action) => {
    try {
      await post(`/${pluginId}/queue/${id}/moderate`, { action })
      toggleNotification({
        type: 'success',
        message: {
          id: 'cmcc.Moderation.Success',
          defaultMessage: 'Item moderated successfully',
        },
      })
      fetchData()
    } catch {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'cmcc.Moderation.Failed',
          defaultMessage: 'Failed to moderate item',
        },
      })
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return

    try {
      await post(`/${pluginId}/queue/bulk`, {
        itemIds: selectedIds,
        action,
      })
      toggleNotification({
        type: 'success',
        message: {
          id: 'cmcc.Bulk.Success',
          defaultMessage: 'Bulk action completed successfully',
        },
      })
      setSelectedIds([])
      fetchData()
    } catch {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'cmcc.Bulk.Failed',
          defaultMessage: 'Bulk action failed',
        },
      })
    }
  }

  const handleSettingsSave = async (data) => {
    try {
      const res = await put(`/${pluginId}/settings`, data)
      setState((prev) => ({ ...prev, settings: res.data.data }))
      toggleNotification({
        type: 'success',
        message: {
          id: 'cmcc.Settings.Saved',
          defaultMessage: 'Settings saved successfully',
        },
      })
    } catch {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'cmcc.Settings.SaveFailed',
          defaultMessage: 'Failed to save settings',
        },
      })
    }
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)
    try {
      const params = new URLSearchParams({ search: query })
      if (filterStatus) params.append('status', filterStatus)
      const res = await get(`/${pluginId}/queue?${params.toString()}`)
      setState((prev) => ({
        ...prev,
        queueItems: res.data.data || [],
        queuePagination: res.data.pagination || null,
      }))
    } catch {
      // Silently handle search errors
    }
  }

  const handleFilterChange = async (status) => {
    setFilterStatus(status)
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (searchQuery) params.append('search', searchQuery)
      const res = await get(`/${pluginId}/queue?${params.toString()}`)
      setState((prev) => ({
        ...prev,
        queueItems: res.data.data || [],
        queuePagination: res.data.pagination || null,
      }))
    } catch {
      // Silently handle filter errors
    }
  }

  const tabs = [
    { label: 'Queue', testId: 'queue-tab' },
    { label: 'Analytics', testId: 'analytics-tab' },
    { label: 'Activity Log', testId: 'activity-tab' },
    { label: 'Settings', testId: 'settings-tab' },
  ]

  if (loading && !state.queueItems.length) {
    return (
      <Layout>
        <ContentLayout>
          <Flex justifyContent="center" alignItems="center" height="40vh">
            <Loader>Loading CMCC moderation panel...</Loader>
          </Flex>
        </ContentLayout>
      </Layout>
    )
  }

  if (error && !state.queueItems.length) {
    return (
      <Layout>
        <HeaderLayout
          title="CMCC"
          subtitle="Content Moderation Command Center"
        />
        <ContentLayout>
          <Alert title="Error" variant="danger">
            {error}
          </Alert>
          <Box paddingTop={4}>
            <Button onClick={fetchData} variant="secondary">
              Retry
            </Button>
          </Box>
        </ContentLayout>
      </Layout>
    )
  }

  return (
    <Layout>
      <HeaderLayout
        title="CMCC"
        subtitle="Content Moderation Command Center"
        primaryAction={
          currentTab === 0 && selectedIds.length > 0 ? (
            <Flex gap={2}>
              <ActionButton
                label="Approve Selected"
                variant="success"
                onClick={() => handleBulkAction('approve')}
              />
              <ActionButton
                label="Reject Selected"
                variant="danger"
                onClick={() => handleBulkAction('reject')}
              />
              <ActionButton
                label="Mark as Spam"
                variant="warning"
                onClick={() => handleBulkAction('spam')}
              />
            </Flex>
          ) : undefined
        }
      />

      <ContentLayout>
        <TabGroup
          label="CMCC Tabs"
          variant="simple"
          onTabChange={(index) => setCurrentTab(index)}
          selectedTabIndex={currentTab}
        >
          <Tabs>
            {tabs.map((tab) => (
              <Tab key={tab.label} testId={tab.testId}>
                {tab.label}
              </Tab>
            ))}
          </Tabs>

          <Divider />

          <TabPanels>
            {/* Queue Tab */}
            <TabPanel>
              <Box paddingTop={4}>
                {state.queueItems.length === 0 && !loading ? (
                  <EmptyStateLayout
                    icon={<Illo />}
                    content="The moderation queue is empty"
                    action={
                      <Button variant="secondary" onClick={fetchData}>
                        Refresh
                      </Button>
                    }
                  />
                ) : (
                  <QueueTable
                    items={state.queueItems}
                    loading={loading}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onModerate={handleModerate}
                    onSearch={handleSearch}
                    onFilterChange={handleFilterChange}
                    currentFilter={filterStatus}
                    searchQuery={searchQuery}
                    pagination={state.queuePagination}
                  />
                )}
              </Box>
            </TabPanel>

            {/* Analytics Tab */}
            <TabPanel>
              <Box paddingTop={4}>
                {state.analytics ? (
                  <Grid gap={4}>
                    <GridItem col={3} s={6} xs={12}>
                      <Box
                        padding={4}
                        hasRadius
                        background="neutral0"
                        shadow="tableShadow"
                      >
                        <Typography variant="pi" textColor="neutral600">
                          Total Items
                        </Typography>
                        <Box paddingTop={1}>
                          <Typography variant="alpha" fontWeight="bold">
                            {state.analytics.totalItems}
                          </Typography>
                        </Box>
                      </Box>
                    </GridItem>

                    {state.analytics.statusCounts?.map(({ status, count }) => (
                      <GridItem key={status} col={3} s={6} xs={12}>
                        <Box
                          padding={4}
                          hasRadius
                          background="neutral0"
                          shadow="tableShadow"
                        >
                          <Typography
                            variant="pi"
                            textColor="neutral600"
                            style={{ textTransform: 'capitalize' }}
                          >
                            {status}
                          </Typography>
                          <Box paddingTop={1}>
                            <Typography variant="alpha" fontWeight="bold">
                              {count}
                            </Typography>
                          </Box>
                        </Box>
                      </GridItem>
                    ))}
                  </Grid>
                ) : (
                  <EmptyStateLayout
                    icon={<Illo />}
                    content="No analytics data available"
                    action={
                      <Button variant="secondary" onClick={fetchData}>
                        Refresh
                      </Button>
                    }
                  />
                )}

                <Box paddingTop={6}>
                  <Typography variant="delta" as="h3">
                    Moderation Heatmap
                  </Typography>
                  <Box paddingTop={4}>
                    <HeatmapChart
                      data={state.analytics?.recentActivity || []}
                    />
                  </Box>
                </Box>
              </Box>
            </TabPanel>

            {/* Activity Log Tab */}
            <TabPanel>
              <Box paddingTop={4}>
                {state.activityLog.length === 0 && !loading ? (
                  <EmptyStateLayout
                    icon={<Illo />}
                    content="No activity recorded yet"
                    action={
                      <Button variant="secondary" onClick={fetchData}>
                        Refresh
                      </Button>
                    }
                  />
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>
                          <Typography variant="sigma">Moderator</Typography>
                        </th>
                        <th>
                          <Typography variant="sigma">Action</Typography>
                        </th>
                        <th>
                          <Typography variant="sigma">Content Type</Typography>
                        </th>
                        <th>
                          <Typography variant="sigma">Date</Typography>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.activityLog.map((log, idx) => (
                        <tr key={log.id || idx}>
                          <td>
                            <Typography>{log.moderatorId}</Typography>
                          </td>
                          <td>
                            <Status
                              variant={
                                log.action === 'approved'
                                  ? 'success'
                                  : log.action === 'rejected'
                                    ? 'danger'
                                    : log.action === 'marked_spam'
                                      ? 'warning'
                                      : 'secondary'
                              }
                            >
                              {log.action}
                            </Status>
                          </td>
                          <td>
                            <Typography>{log.contentType}</Typography>
                          </td>
                          <td>
                            <Typography variant="pi">
                              {new Date(log.createdAt).toLocaleString()}
                            </Typography>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Box>
            </TabPanel>

            {/* Settings Tab */}
            <TabPanel>
              <Box paddingTop={4}>
                <SettingsForm
                  initialData={state.settings}
                  onSubmit={handleSettingsSave}
                  loading={loading}
                />
              </Box>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </ContentLayout>
    </Layout>
  )
}

export default App
