from fastapi import APIRouter, Depends
from app.api.deps import get_db
from app.schemas.driver import DriverCreate, DriverResponse, DriverUpdate
from app.repositories.driver_repo import get_drivers, create_driver, get_driver, delete_driver, update_driver

router = APIRouter()


@router.get("/", response_model=list[DriverResponse])
def get_all_drivers(db = Depends(get_db)):
    drivers = get_drivers(db)
    return drivers


@router.post("/", response_model=DriverResponse)
def create_driver_endpoint(
    driver: DriverCreate,
    db = Depends(get_db)
):
    new_driver = create_driver(db, driver)
    return new_driver

@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver_by_id(
    driver_id: str,
    db = Depends(get_db)
):
    driver = get_driver(db, driver_id)
    return driver


@router.delete("/{driver_id}")
def delete_driver_by_id(
    driver_id: str,
    db = Depends(get_db)
):
   return delete_driver(db, driver_id)

@router.put("/{driver_id}", response_model=DriverResponse)
def update_driver_by_id(
    driver_id: str,
    driver: DriverUpdate,
    db = Depends(get_db)
):
    updated_driver = update_driver(db, driver_id, driver)
    return updated_driver