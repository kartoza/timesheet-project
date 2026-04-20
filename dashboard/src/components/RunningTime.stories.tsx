import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import RunningTime from './RunningTime';

const meta: Meta<typeof RunningTime> = {
  title: 'Components/RunningTime',
  component: RunningTime,
};

export default meta;

type Story = StoryObj<typeof RunningTime>;

function RunningTimeStory(args: any) {
  const [runningTime, setRunningTime] = useState(args.runningTime);

  return (
    <RunningTime
      {...args}
      runningTime={runningTime}
      onChange={setRunningTime}
    />
  );
}

export const Default: Story = {
  render: (args) => <RunningTimeStory {...args} />,
  args: {
    runningTime: '01:15:30',
    disabled: false,
  },
};

export const Disabled: Story = {
  render: (args) => <RunningTimeStory {...args} />,
  args: {
    runningTime: '08:00:00',
    disabled: true,
  },
};
