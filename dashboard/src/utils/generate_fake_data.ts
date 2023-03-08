import faker from 'faker'
import randomColor from 'randomcolor'
import moment from 'moment'

export default function (groupCount = 30, itemCount = 10, daysInPast = 30) {
  let randomSeed = Math.floor(Math.random() * 1000)
  let groups: any = []
  for (let i = 0; i < groupCount; i++) {
    groups.push({
      id: `${i + 1}`,
      title: faker.name.firstName(),
      rightTitle: faker.name.lastName(),
      stackItems: false,
      bgColor: randomColor({ luminosity: 'light', seed: randomSeed + i })
    })
  }
  let items: any = []
  for (let i = 0; i < itemCount; i++) {
    const startDate = faker.date.recent(daysInPast).valueOf() + (daysInPast * 0.5) * 86400 * 1000
    const startValue = Math.floor(moment(startDate).valueOf() / 10000000) * 10000000
    const endValue = moment(startDate + faker.random.number({ min: 100, max: 1000 }) * 15 * 60 * 1000).valueOf()

    items.push({
      id: i + '',
      group: faker.random.number({ min: 1, max: groups.length }) + '',
      title: ``,
      start: startValue,
      end: endValue,
      canMove: true,
      canResize: true,
      className: (moment(startDate).day() === 6 || moment(startDate).day() === 0) ? 'item-weekend' : '',
      itemProps: {
        'data-tip': faker.hacker.phrase(),
      }
    })
  }
  items = items.sort((a, b) => b - a)
  return { groups, items }
}
