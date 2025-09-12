import { useState } from 'react'
import Button from './Button/Button'
import ScheduleStudioDialog from './Dialog/ScheduleStudioDialog'

const Schedule = ({ canEdit, scheduledDetails, onSubmit }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)

  const handleOpenDialog = () => {
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
  }

  const handleScheduleSubmit = ({ date, time }) => {
    const localDate = new Date(`${date}T${time}:00`)
    const utcDate = localDate.toISOString()
    onSubmit(utcDate)
    setIsScheduled(true)
    setIsDialogOpen(false)
  }

  const handleEditSchedule = () => {
    setIsDialogOpen(true)
  }

  const handleRemoveSchedule = () => {
    setIsScheduled(false)
  }

  const formatDateForDisplay = (utcString) => {
  if (!utcString) return ''
  try {
    const date = new Date(utcString)

    const day = date.getDate()
    const suffix = ((d) => {
      if (d > 3 && d < 21) return 'th'
      switch (d % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
      }
    })(day)

    // Detect user timezone automatically
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Format with user’s timezone
    let formatted = date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: userTimeZone,
    })

    // Append timezone abbreviation manually
    const timeZoneMap = {
      'Asia/Calcutta': 'IST',
      'America/New_York': 'EST',
      'America/Los_Angeles': 'PST',
      'Europe/London': 'GMT',
      // add more if you want
    }

    const tzAbbr = timeZoneMap[userTimeZone] || userTimeZone

    return `${formatted.replace(/\d{1,2}/, day + suffix)} (${tzAbbr})`
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}


  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return ''
    try {
      const [hours, minutes] = timeString.split(':').map(Number)
      const date = new Date()
      date.setHours(hours, minutes)

      const options = { hour: 'numeric', minute: '2-digit', hour12: true }
      let formattedTime = new Intl.DateTimeFormat('en-US', options).format(date)

      formattedTime = formattedTime.replace('AM', 'A.M.').replace('PM', 'P.M.')
      return formattedTime
    } catch (error) {
      console.error('Error formatting time:', error)
      return timeString
    }
  }

  return (
    <div className='space-y-4 rounded-lg'>
      <h3 className='text-md font-medium text-white'>Schedule Studio</h3>
      <p className='text-xs text-gray-400'>
        Mark this studio as scheduled to let others know when you will be
        available.
      </p>

      {!isScheduled && (
        <Button
          text={'Schedule'}
          onClick={handleOpenDialog}
          className='hover:bg-[#6f4ed1]'
          bgColor='bg-[#8A65FD]' // Assuming your Button component allows overriding bg
          textColor='text-white' // Assuming your Button component allows overriding text color
        />
      )}

      {isScheduled && scheduledDetails && (
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-4'>
          <div className='text-gray-400 text-sm'>
            Scheduled for:{' '}
            <span className='text-green-500'>
              {formatDateForDisplay(scheduledDetails)}
            </span>
          </div>
          {canEdit && (
            <div className='flex gap-2'>
              <Button
                text={'Edit'}
                onClick={handleEditSchedule}
                bgColor='bg-[#8A65FD]'
              />
              <Button
                text={'Remove'}
                onClick={handleRemoveSchedule}
                bgColor='bg-[#313131]'
                textColor='text-white'
                borderColor='border-transparent'
                className='hover:bg-gray-700'
              />
            </div>
          )}
        </div>
      )}

      <ScheduleStudioDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleScheduleSubmit}
      />
    </div>
  )
}

export default Schedule
