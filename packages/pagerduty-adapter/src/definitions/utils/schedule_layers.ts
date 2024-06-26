/*
 *                      Copyright 2024 Salto Labs Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import _ from 'lodash'
import { definitions } from '@salto-io/adapter-components'
import { getChangeData } from '@salto-io/adapter-api'
import { getParent } from '@salto-io/adapter-utils'
import { values as lowerdashValues } from '@salto-io/lowerdash'

export const addStartTime = (value: unknown): Record<string, unknown> => {
  if (!lowerdashValues.isPlainRecord(value)) {
    throw new Error('Can not adjust when the value is not an object')
  }
  return { ...value, start: value.rotation_virtual_start }
}

export const addStartToLayers: definitions.AdjustFunction<definitions.deploy.ChangeAndContext> = ({ value }) => {
  if (!lowerdashValues.isPlainRecord(value)) {
    throw new Error('Can not adjust when the value is not an object')
  }
  const layers = _.get(value, 'schedule.schedule_layers')
  if (!Array.isArray(layers)) {
    throw new Error('Can not adjust when the layers are not an array')
  }
  return { value: _.set(value, 'schedule.schedule_layers', layers.map(addStartTime)) }
}

export const addTimeZone: definitions.AdjustFunction<definitions.deploy.ChangeAndContext> = ({ value, context }) => ({
  value: {
    schedule: { schedule_layers: [addStartTime(value)], time_zone: _.get(context, 'additionalContext.time_zone') },
  },
})

export const shouldChangeLayer: definitions.deploy.DeployRequestCondition = {
  custom:
    () =>
    ({ changeGroup, change }) =>
      !changeGroup.changes.some(
        changeFromGroup =>
          getChangeData(changeFromGroup).elemID.getFullName() === getParent(getChangeData(change)).elemID.getFullName(),
      ),
}
