import axios from 'axios'

const AXIOS_CONFIG_DHIS2 = {
  baseURL: 'https://play.dhis2.org/2.29/api/',
  auth: {
    username: 'admin',
    password: 'district'
  }
}

const AXIOS_CONFIG_OCL = {
  baseURL: 'https://api.openconceptlab.org/',
  headers: {
    Authorization: 'Token 87154265fd54301fdf2c858b00e598e4306e6c2b'
  }
  // params: {
  //   limit: 0
  // }
}

const OCL_ORG = 'MSF-OCB'
const OCL_INDICATOR_REGISTRY_SOURCE = 'dhis2-indicator-registry'

const dhis2Api = axios.create(AXIOS_CONFIG_DHIS2)
const oclApi = axios.create(AXIOS_CONFIG_OCL)
const oclSourceUrl = `/orgs/${OCL_ORG}/sources/${OCL_INDICATOR_REGISTRY_SOURCE}`

oclApi.get(oclSourceUrl) // Gets the registry of indicators in OCL
// TODO Create the registry of indicators in OCL if it doesn't exist yet?
  .then(() => {
    const rubric = 'indicators'
    dhis2Api.get(rubric) // Browses all the indicators in DHIS2
      .then(({data}) => {
        data[rubric].forEach(item => {
          dhis2Api.get(`${rubric}/${item.id}`) // Gets the corresponding indicator in OCL
            .then(({data}) => {
              oclApi.get(`${oclSourceUrl}/concepts/${data.id}`)
                .then(({data}) => { // Indicator already exists in OCL. Checks if update needed, then create a new version in OCL
                  console.log(`Indicator ${data.id} found. Updating the OCL concept...`)
                  // TODO update/create new version
                })
                .catch(({response}) => {
                  if (response && response.status === 404) { // Indicator not found in OCL. Create a new OCL indicator
                    console.log(`Indicator ${data.id} not found. Creating the OCL concept...`)
                    // TODO get all the indicator data from DHIS2
                    let oclConcept = {
                      id: data.id,
                      external_id: data.id,
                      datatype: 'Numeric',
                      concept_class: 'Indicator',
                      names: [
                        {
                          name: data.name,
                          locale: 'en',
                          locale_preferred: true,
                          name_type: 'Designated Preferred Name'
                        }
                      ]
                    }
                    if (data.description) {
                      oclConcept.descriptions = [
                        {
                          description: data.description,
                          locale: 'en'
                        }]
                    }
                    oclApi.post(`${oclSourceUrl}/concepts/`, oclConcept)
                      .then(() => {
                        console.log(`Indicator ${data.id} created in OCL`)
                      })
                      .catch(() => {
                        console.error(`Error in creating the OCL indicator ${data.id}`)
                      })
                  } else {
                    console.error('Error in getting an OCL concept')
                  }
                })
            })
            .catch(() => {
              console.error('Error in getting an item in DHIS2 metadata')
            })
        })
      })
      .catch(error => {
        console.warn(error)
      })
  })
  .catch(({response}) => {
    if (response.status === 404) {
      console.error(`OCL source ${oclSourceUrl} does not exist. Create it before running this script`)
    } else {
      console.error('Error in connecting to OCL')
    }
  })
