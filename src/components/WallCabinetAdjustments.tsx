import {
  WALL_DOOR_CATEGORY_DETAILS,
  getWallCabinetFamily,
  getWallCabinetModel,
  type WallCabinetOptions,
  type WallCabinetModelNumber,
  type WallCabinetType,
  type WallCarcassMaterial,
  type WallDoorCategory,
  type WallDoorHand,
} from '../model'

interface WallCabinetAdjustmentsProps {
  cabinetType: WallCabinetType
  options: WallCabinetOptions
  onModelNumberChange: (modelNumber: WallCabinetModelNumber) => void
  onDoorCategoryChange: (category: WallDoorCategory) => void
  onDoorHandChange: (hand: WallDoorHand) => void
  onCarcassMaterialChange: (material: WallCarcassMaterial) => void
}

const WALL_DOOR_CATEGORIES = ['A', 'B', 'C'] as const

export function WallCabinetAdjustments({
  cabinetType,
  options,
  onModelNumberChange,
  onDoorCategoryChange,
  onDoorHandChange,
  onCarcassMaterialChange,
}: WallCabinetAdjustmentsProps) {
  const family = getWallCabinetFamily(cabinetType)
  const model = getWallCabinetModel(cabinetType, options.modelNumber)
  const category = WALL_DOOR_CATEGORY_DETAILS[options.doorCategory]
  const listPrice = model.prices[options.doorCategory]

  return (
    <section
      className="wall-catalog-options"
      aria-label="Wall cabinet catalog adjustments"
    >
      <div className="wall-catalog-options__heading">
        <div>
          <p className="wall-catalog-options__eyebrow">Catalog adjustments</p>
          <h2>{model.modelNumber}</h2>
        </div>
        <output aria-label="Catalog list price">${listPrice}</output>
      </div>

      <div className="wall-option-grid">
        <label className="wall-option-field">
          <span>Model number</span>
          <span className="catalog-select">
            <select
              value={options.modelNumber}
              onChange={(event) =>
                onModelNumberChange(
                  event.currentTarget.value as WallCabinetModelNumber,
                )
              }
            >
              {family.models.map((candidate) => (
                <option
                  key={candidate.modelNumber}
                  value={candidate.modelNumber}
                >
                  {candidate.modelNumber} · {candidate.width}″ wide
                </option>
              ))}
            </select>
          </span>
        </label>

        {family.doorCount === 1 && (
          <label className="wall-option-field">
            <span>Door handing</span>
            <span className="catalog-select">
              <select
                value={options.doorHand}
                onChange={(event) =>
                  onDoorHandChange(event.currentTarget.value as WallDoorHand)
                }
              >
                <option value="left">Left hinged</option>
                <option value="right">Right hinged</option>
              </select>
            </span>
          </label>
        )}

        <label className="wall-option-field">
          <span>Door category</span>
          <span className="catalog-select">
            <select
              value={options.doorCategory}
              onChange={(event) =>
                onDoorCategoryChange(
                  event.currentTarget.value as WallDoorCategory,
                )
              }
            >
              {WALL_DOOR_CATEGORIES.map((candidate) => (
                <option key={candidate} value={candidate}>
                  Category {candidate}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="wall-option-field">
          <span>Carcass material</span>
          <span className="catalog-select">
            <select
              value={options.carcassMaterial}
              onChange={(event) =>
                onCarcassMaterialChange(
                  event.currentTarget.value as WallCarcassMaterial,
                )
              }
            >
              <option value="standard-melamine">
                Industrial melamine
              </option>
              <option value="maple-veneer">
                Maple veneer-core + clear coat
              </option>
            </select>
          </span>
        </label>
      </div>

      <div className="wall-catalog-specs" aria-label="Selected specifications">
        <span>{model.width}″ W</span>
        <span>{model.height}″ H</span>
        <span>{model.depth}″ D</span>
        <span>
          {family.shelfCount} adjustable shelves
        </span>
      </div>

      <details className="door-category-details">
        <summary>
          Category {options.doorCategory} · {category.summary}
        </summary>
        <ul>
          {category.options.map((option) => (
            <li key={option}>{option}</li>
          ))}
        </ul>
      </details>

      {options.carcassMaterial === 'maple-veneer' && (
        <p className="catalog-surcharge-note">
          Maple veneer-core is an additional-charge option. The catalog does
          not provide the surcharge amount, so it is not included above.
        </p>
      )}
      <p className="catalog-source-note">
        List price from the October 1999 catalog. Category D was blank. The
        12″ wall depth is a documented project assumption.
      </p>
    </section>
  )
}
