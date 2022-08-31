/*
*                      Copyright 2022 Salto Labs Ltd.
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
import { Element, ElemID, ObjectType, InstanceElement, BuiltinTypes, StaticFile } from '@salto-io/adapter-api'
import filterCreator from '../../src/filters/email_template_static_files'
import { FilterWith } from '../../src/filter'
import { SALESFORCE, EMAIL_TEMPLATE_METADATA_TYPE, METADATA_TYPE } from '../../src/constants'
import { defaultFilterContext } from '../utils'

describe('emailTemplate static files filter', () => {
  const ATTACHMENTS = 'attachments'
  const CONTENT = 'content'
  const FULL_NAME = 'fullName'
  const ATTACHMENT_AS_STRING = 'attachment'
  const EMAILCONTENT = 'email-content'
  const ATTACHMENT_NAME = 'attachment.txt'
  let elements: Element[]

  const emailTemplateID = new ElemID(SALESFORCE, EMAIL_TEMPLATE_METADATA_TYPE)

  const fields = {
    [CONTENT]: { refType: BuiltinTypes.STRING },
    [ATTACHMENTS]: { refType: BuiltinTypes.STRING },
    [FULL_NAME]: { refType: BuiltinTypes.STRING },
  }

  const emailType = new ObjectType({
    annotations: { [METADATA_TYPE]: EMAIL_TEMPLATE_METADATA_TYPE },
    elemID: emailTemplateID,
    fields,
    path: ['Objects', 'dir'],
  })

  const attachment = new StaticFile({
    filepath: 'salesforce/Records/EmailTemplate/unfiled$public/emailTemplate/attachment.txt',
    content: Buffer.from(ATTACHMENT_AS_STRING),
    encoding: 'utf-8',
  })

  const staticContent = new StaticFile({
    filepath: 'Objects/dir/emailTemplate.email',
    content: Buffer.from(EMAILCONTENT),
    encoding: 'utf-8',
  })

  describe('on fetch', () => {
    type FilterType = FilterWith<'onFetch'>
    let filter: FilterType

    describe('attachment as an object', () => {
      beforeAll(async () => {
        const emailNoArrayAttachment = new InstanceElement('emailTemplate', emailType, {
          [ATTACHMENTS]: { name: ATTACHMENT_NAME, content: ATTACHMENT_AS_STRING },
          [CONTENT]: staticContent,
          [FULL_NAME]: 'unfiled$public/emailTemplate',
        },
        ['Objects', 'dir', 'emailTemplate'])

        elements = [emailNoArrayAttachment, emailType]

        filter = filterCreator({ config: defaultFilterContext }) as FilterType
        await filter.onFetch(elements)
      })

      it('should extract attachment content to static file when emailTemplate has has attachment not in array', () => {
        const receivedEmailTemplate = elements[0] as InstanceElement
        expect(receivedEmailTemplate?.value.attachments).toIncludeSameMembers(
          [{ name: ATTACHMENT_NAME, content: attachment }]
        )
        expect(receivedEmailTemplate?.value.content?.filepath).toEqual(
          'salesforce/Records/EmailTemplate/unfiled$public/emailTemplate/emailTemplate.email'
        )
      })
    })

    describe('attachment as an array', () => {
      beforeAll(async () => {
        const emailArrayAttachment = new InstanceElement('emailTemplate', emailType, {
          [ATTACHMENTS]: [{ name: ATTACHMENT_NAME, content: ATTACHMENT_AS_STRING }],
          [CONTENT]: staticContent,
          [FULL_NAME]: 'unfiled$public/emailTemplate',
        },
        ['Objects', 'dir', 'emailTemplate'])

        elements = [emailArrayAttachment, emailType]

        filter = filterCreator({ config: defaultFilterContext }) as FilterType
        await filter.onFetch(elements)
      })

      it('should extract attachment content to static file when emailTemplate has attachment in array', () => {
        const receivedEmailTemplate = elements[0] as InstanceElement
        expect(receivedEmailTemplate?.value.attachments).toIncludeSameMembers(
          [{ name: ATTACHMENT_NAME, content: attachment }]
        )
        expect(receivedEmailTemplate?.value.content?.filepath).toEqual(
          'salesforce/Records/EmailTemplate/unfiled$public/emailTemplate/emailTemplate.email'
        )
      })
    })

    describe('can not create new folder due missing data', () => {
      beforeAll(async () => {
        const emailTemplateNoFullName = new InstanceElement('emailTemplate', emailType, {
          [ATTACHMENTS]: [{ name: ATTACHMENT_NAME, content: ATTACHMENT_AS_STRING }],
        })

        elements = [emailTemplateNoFullName, emailType]

        filter = filterCreator({ config: defaultFilterContext }) as FilterType
        await filter.onFetch(elements)
      })

      it('should not replace content when emailTemplate instance has no full name', () => {
        const instanceUndefinedPath = elements[0] as InstanceElement
        expect(instanceUndefinedPath?.value.attachments)
          .toIncludeSameMembers([{ name: ATTACHMENT_NAME, content: ATTACHMENT_AS_STRING }])
      })
    })
  })
})
