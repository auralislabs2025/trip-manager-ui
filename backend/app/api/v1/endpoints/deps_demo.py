from fastapi import APIRouter,Depends
router = APIRouter(prefix="/deps-demo")
def common_dependency():
    return "hello from dependency"
@router.get("/")
def demo(dep=Depends(common_dependency)):
    return {"message",dep}