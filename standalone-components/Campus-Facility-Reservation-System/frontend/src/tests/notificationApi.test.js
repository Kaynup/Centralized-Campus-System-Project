import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '../api/apiClient'
import * as notificationApi from '../api/notificationApi'

vi.mock('../api/apiClient')

describe('notificationApi', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetchNotifications calls correct endpoint', async () => {
    const mockData = [{ id: 1, type: 'test' }]
    apiClient.get.mockResolvedValueOnce({ data: mockData })

    const result = await notificationApi.fetchNotifications()
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications')
    expect(result).toEqual(mockData)
  })

  it('markNotificationRead calls correct endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } })

    const result = await notificationApi.markNotificationRead(123)
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/notifications/123/read')
    expect(result).toEqual({ success: true })
  })

  it('markAllNotificationsRead calls correct endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } })

    const result = await notificationApi.markAllNotificationsRead()
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/notifications/read-all')
    expect(result).toEqual({ success: true })
  })

  it('clearReadNotifications calls correct endpoint', async () => {
    apiClient.delete.mockResolvedValueOnce({ data: { success: true } })

    const result = await notificationApi.clearReadNotifications()
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/notifications/clear-read')
    expect(result).toEqual({ success: true })
  })
})
